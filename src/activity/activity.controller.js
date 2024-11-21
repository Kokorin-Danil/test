import Activity from './activity.model.js';
import Posts from '../posts/posts.model.js';
import User from '../users/users.model.js';
import { Op } from 'sequelize';
import { notifyUser } from '../../websocket.js';
import dbPosts from '../../db.js';

const entityTypes = {
  post: {
    model: Posts,
    name: 'Post',
    foreignKey: 'postId',
  },
  comment: {
    model: Activity,
    name: 'Comment',
    foreignKey: 'commentId',
    validType: 'comment',
  },
  reply: {
    model: Activity,
    name: 'Reply',
    foreignKey: 'commentId',
    validType: 'reply',
  },
};

class ActivityController {
  // Универсальная функция для лайков
  async toggleLike(req, res) {
    const { type, id } = req.params;
    const { userId } = req.user;

    const t = await dbPosts.transaction(); // Теперь используем dbPosts для транзакции

    try {
      // Проверяем, поддерживается ли тип
      if (!entityTypes[type]) {
        return res.status(400).json({ error: 'Invalid type.' });
      }

      // Ищем объект, который лайкаем
      const entity = await entityTypes[type].model.findOne({
        where: {
          id,
          ...(entityTypes[type].validType && {
            type: entityTypes[type].validType,
          }),
        },
        transaction: t, // Используем транзакцию для этой операции
      });

      if (!entity) {
        return res
          .status(404)
          .json({ error: `${entityTypes[type].name} not found.` });
      }

      // Проверяем, существует ли лайк
      const likeCondition = {
        type: 'like',
        userId,
        [entityTypes[type].foreignKey]: id,
      };

      const existingLike = await Activity.findOne({
        where: likeCondition,
        transaction: t,
      }); // Используем транзакцию

      let message;
      if (existingLike) {
        // Удаляем лайк
        await existingLike.destroy({ transaction: t }); // Используем транзакцию
        if (type === 'post') {
          entity.likes -= 1;
          await entity.save({ transaction: t }); // Используем транзакцию
        }
        message = 'Like removed.';
      } else {
        // Добавляем лайк
        await Activity.create(likeCondition, { transaction: t }); // Используем транзакцию
        if (type === 'post') {
          entity.likes += 1;
          await entity.save({ transaction: t }); // Используем транзакцию

          // Уведомляем автора поста
          if (entity.userId !== userId) {
            notifyUser(entity.userId, {
              type: 'new_like',
              message: `Ваш пост получил новый лайк!`,
              data: {
                postId: entity.id,
                likedBy: { userId, username: req.user.name },
                timestamp: new Date().toISOString(),
              },
            });
          }
        }
        message = 'Like added.';
      }

      await t.commit(); // Завершаем транзакцию

      res.status(200).json({ message });
    } catch (err) {
      await t.rollback(); // В случае ошибки откатываем транзакцию
      console.error('Error toggling like:', err);
      res.status(500).json({ error: 'Error while toggling like.' });
    }
  }

  // Универсальная функция для создания комментариев/ответов
  async createCommentOrReply(req, res) {
    const { type, id } = req.params;
    const { content } = req.body;
    const { userId } = req.user;

    const t = await dbPosts.transaction(); // Создание транзакции

    try {
      if (!entityTypes[type]) {
        return res.status(400).json({ error: 'Invalid type.' });
      }

      const entity = await entityTypes[type].model.findOne({
        where: {
          id,
          ...(entityTypes[type].validType && {
            type: entityTypes[type].validType,
          }),
        },
        transaction: t, // Указываем транзакцию
      });

      if (!entity) {
        return res
          .status(404)
          .json({ error: `${entityTypes[type].name} not found.` });
      }

      const activityType = type === 'post' ? 'comment' : 'reply';
      const activityData = {
        type: activityType,
        userId,
        content,
        [entityTypes[type].foreignKey]: id,
      };

      const activity = await Activity.create(activityData, { transaction: t }); // Создаем комментарий/ответ в транзакции

      if (type === 'post') {
        entity.commentCount += 1;
        await entity.save({ transaction: t }); // Обновляем счетчик комментариев в транзакции

        if (entity.userId !== userId) {
          notifyUser(entity.userId, {
            type: 'new_comment',
            message: `Ваш пост получил новый комментарий: "${content}"`,
            data: {
              postId: entity.id,
              commentedBy: { userId, username: req.user.username },
              timestamp: new Date().toISOString(),
            },
          });
        }
      }

      await t.commit(); // Коммитим транзакцию
      res.status(201).json({
        message: `${type === 'post' ? 'Comment' : 'Reply'} added.`,
        activity,
      });
    } catch (err) {
      await t.rollback(); // Откатываем транзакцию в случае ошибки
      console.error('Error creating comment or reply:', err);
      res.status(500).json({ error: 'Error while creating comment or reply.' });
    }
  }

  // Универсальная функция для подсчёта лайков
  async getLikeCount(req, res) {
    const { type, id } = req.params;

    try {
      // Проверяем, поддерживается ли тип
      if (!entityTypes[type]) {
        return res.status(400).json({ error: 'Invalid type.' });
      }

      // Проверяем существование сущности
      const entity = await entityTypes[type].model.findOne({
        where: {
          id,
          ...(entityTypes[type].validType && {
            type: entityTypes[type].validType,
          }),
        },
      });

      if (!entity) {
        return res
          .status(404)
          .json({ error: `${entityTypes[type].name} not found.` });
      }

      // Подсчитываем лайки
      const likeCount = await Activity.count({
        where: {
          type: 'like',
          [entityTypes[type].foreignKey]: id,
        },
      });

      res.status(200).json({ likeCount });
    } catch (err) {
      console.error('Error getting like count:', err);
      res.status(500).json({ error: 'Error while getting like count.' });
    }
  }

  async getCommentsAndReplies(req, res) {
    const { id, type } = req.params; // ID объекта и его тип (comment или reply)
    const { page = 1, limit = 5 } = req.query; // Параметры пагинации
    const limitInt = parseInt(limit, 10) || 5; // Лимит элементов на странице
    const offset = (parseInt(page, 10) - 1) * limitInt; // Смещение для пагинации

    try {
      // Унифицированная проверка объекта (post, comment или reply)
      let targetObject;
      if (type === 'comment') {
        targetObject = await Posts.findByPk(id);
        if (!targetObject) {
          return res.status(404).json({ error: 'Post not found' });
        }
      } else if (type === 'reply') {
        targetObject = await Activity.findOne({
          where: { id, type: 'comment' },
        });
        if (!targetObject) {
          return res.status(404).json({ error: 'Comment not found' });
        }
      } else {
        return res.status(400).json({
          error: 'Invalid type. Valid values are "comment" or "reply".',
        });
      }

      // Определяем условия выборки в зависимости от типа
      const whereCondition =
        type === 'comment'
          ? { type: 'comment', postId: id }
          : { type: 'reply', commentId: id };

      // Считаем общее количество элементов
      const totalItems = await Activity.count({ where: whereCondition });

      // Получаем элементы с пагинацией
      const items = await Activity.findAll({
        where: whereCondition,
        order: [['createdAt', 'ASC']], // Сортировка по времени создания
        limit: limitInt,
        offset,
        include: [
          {
            model: User, // Модель User, без alias, так как alias не задан
            attributes: ['id', 'name', 'surname'], // Выбираем только нужные поля
          },
        ],
      });

      // Вычисляем общее количество страниц
      const totalPages = Math.ceil(totalItems / limitInt);

      // Возвращаем ответ с данными и мета-данными
      res.status(200).json({
        items,
        meta: {
          totalItems,
          currentPage: parseInt(page, 10),
          totalPages,
          limit: limitInt,
        },
      });
    } catch (err) {
      console.error('Error fetching comments or replies:', err);
      res
        .status(500)
        .json({ error: 'Error while fetching comments or replies' });
    }
  }
}

// Экспортируем экземпляр класса ActivityController
export default new ActivityController();
