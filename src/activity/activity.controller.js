import Activity from './activity.model.js';
import Posts from '../posts/posts.model.js';
import User from '../users/users.model.js';
import { Op } from 'sequelize';
import { notifyUser } from '../../websocket.js';

class ActivityController {
  // Лайк
  async toggleLike(req, res) {
    const { type, id } = req.params; // Тип объекта (post, comment, reply) и его ID
    const { userId } = req.user; // ID пользователя из токена

    try {
      let targetObject; // Объект, к которому применяется лайк
      let likeCondition; // Условие для поиска существующего лайка

      // Определяем, что мы лайкаем
      if (type === 'post') {
        targetObject = await Posts.findByPk(id);
        if (!targetObject) {
          return res.status(404).json({ error: 'Post not found' });
        }
        likeCondition = { type: 'like', postId: id, userId };
      } else if (type === 'comment' || type === 'reply') {
        targetObject = await Activity.findOne({
          where: { id, type: type === 'comment' ? 'comment' : 'reply' },
        });
        if (!targetObject) {
          return res.status(404).json({
            error: `${type === 'comment' ? 'Comment' : 'Reply'} not found`,
          });
        }
        likeCondition = { type: 'like', commentId: id, userId };
      } else {
        return res.status(400).json({
          error: 'Invalid type. Valid types are "post", "comment", "reply".',
        });
      }

      // Проверяем, существует ли уже лайк
      const existingLike = await Activity.findOne({ where: likeCondition });

      if (existingLike) {
        // Если лайк существует, удаляем его
        await existingLike.destroy();

        if (type === 'post') {
          targetObject.likes -= 1;
          await targetObject.save();
        }

        return res.status(200).json({ message: 'Like removed' });
      } else {
        // Если лайка нет, создаем новый
        const newLikeData = { type: 'like', userId };
        if (type === 'post') {
          newLikeData.postId = id;
        } else {
          newLikeData.commentId = id;
        }

        await Activity.create(newLikeData);

        if (type === 'post') {
          if (targetObject.userId !== userId) {
            console.log(
              `Sending notification to user ${targetObject.userId} about new like...`
            );
            notifyUser(targetObject.userId, {
              type: 'new_like',
              message: `Ваш пост получил новый лайк!`,
              data: {
                postId: targetObject.id,
                likedBy: {
                  userId,
                  username: req.user.name,
                },
                timestamp: new Date().toISOString(),
              },
            });
          }

          targetObject.likes += 1;
          await targetObject.save();
        }

        return res.status(200).json({ message: 'Like added' });
      }
    } catch (err) {
      console.error('Error while toggling like:', err);
      res.status(500).json({ error: 'Error while toggling the like' });
    }
  }

  // Создание комментария
  async createCommentOrReply(req, res) {
    const { type, id } = req.params; // Тип объекта (post, comment, reply) и его ID
    const { content } = req.body; // Содержимое комментария или ответа
    const { userId } = req.user; // ID пользователя из токена

    try {
      let targetObject; // Объект, к которому добавляется комментарий/ответ
      let newActivityData; // Данные для создания активности

      if (type === 'post') {
        // Проверяем, что пост существует
        targetObject = await Posts.findByPk(id);
        if (!targetObject) {
          return res.status(404).json({ error: 'Post not found' });
        }

        // Формируем данные для нового комментария
        newActivityData = {
          type: 'comment',
          userId,
          postId: id,
          content,
        };

        // Увеличиваем количество комментариев на посте
        targetObject.commentCount += 1;
        await targetObject.save();

        // Уведомляем автора поста
        if (targetObject.userId !== userId) {
          notifyUser(targetObject.userId, {
            type: 'new_comment',
            message: `Ваш пост получил новый комментарий: "${content}"`,
            data: {
              postId: targetObject.id,
              commentedBy: {
                userId,
                username: req.user.username,
              },
              timestamp: new Date().toISOString(),
            },
          });
        }
      } else if (type === 'comment' || type === 'reply') {
        // Проверяем, что комментарий или ответ существует
        targetObject = await Activity.findByPk(id);
        if (
          !targetObject ||
          !['comment', 'reply'].includes(targetObject.type)
        ) {
          return res.status(404).json({ error: 'Comment or reply not found' });
        }

        // Формируем данные для нового ответа
        newActivityData = {
          type: 'reply',
          userId,
          commentId:
            targetObject.type === 'comment' ? id : targetObject.commentId, // ID родительского комментария
          content,
        };
      } else {
        return res.status(400).json({
          error: 'Invalid type. Valid types are "post", "comment", or "reply".',
        });
      }

      // Создаем активность (комментарий или ответ)
      const activity = await Activity.create(newActivityData);

      res.status(201).json({
        message: `${type === 'post' ? 'Comment' : 'Reply'} added`,
        activity,
      });
    } catch (err) {
      console.error('Error while adding comment or reply:', err);
      res
        .status(500)
        .json({ error: 'Error while adding the comment or reply' });
    }
  }

  async getLikeCount(req, res) {
    const { type, id } = req.params; // Получаем тип объекта (post, comment, reply) и его ID

    try {
      let condition = {};

      if (type === 'post') {
        // Проверяем, существует ли пост
        const post = await Posts.findByPk(id);
        if (!post) {
          return res.status(404).json({ error: 'Post not found' });
        }

        condition = { postId: id, type: 'like' };
      } else if (type === 'comment' || type === 'reply') {
        // Проверяем, существует ли комментарий или ответ
        const activity = await Activity.findOne({
          where: { id, type: type === 'comment' ? 'comment' : 'reply' },
        });

        if (!activity) {
          return res.status(404).json({
            error: `${type === 'comment' ? 'Comment' : 'Reply'} not found`,
          });
        }

        condition = { commentId: id, type: 'like' };
      } else {
        return res.status(400).json({
          error: 'Invalid type. Valid types are "post", "comment", or "reply".',
        });
      }

      // Считаем количество лайков
      const likeCount = await Activity.count({ where: condition });

      res.status(200).json({ likeCount });
    } catch (err) {
      console.error('Error while getting like count:', err);
      res.status(500).json({ error: 'Error while getting like count' });
    }
  }

  async getCommentsAndReplies(req, res) {
    const { id, type } = req.params; // Универсальный ID и тип данных
    const { page = 1, limit = 5 } = req.query; // Параметры пагинации

    const limitInt = parseInt(limit, 10) || 5; // Лимит элементов на страницу
    const offset = (parseInt(page, 10) - 1) * limitInt; // Смещение для пагинации

    try {
      let totalItems = 0;
      let items = [];

      // Определяем, что ищем: комментарии к посту или ответы к комментарию
      if (type === 'comment') {
        // Проверяем существование поста
        const post = await Posts.findByPk(id);
        if (!post) {
          return res.status(404).json({ error: 'Post not found' });
        }

        // Получаем общее количество комментариев
        totalItems = await Activity.count({
          where: { type: 'comment', postId: id },
        });

        // Получаем комментарии с пагинацией
        items = await Activity.findAll({
          where: { type: 'comment', postId: id },
          order: [['createdAt', 'ASC']],
          limit: limitInt,
          offset,
        });
      } else if (type === 'reply') {
        // Проверяем существование комментария
        const comment = await Activity.findOne({
          where: { id, type: 'comment' },
        });
        if (!comment) {
          return res.status(404).json({ error: 'Comment not found' });
        }

        // Получаем общее количество ответов
        totalItems = await Activity.count({
          where: { type: 'reply', commentId: id },
        });

        // Получаем ответы с пагинацией
        items = await Activity.findAll({
          where: { type: 'reply', commentId: id },
          order: [['createdAt', 'ASC']],
          limit: limitInt,
          offset,
        });
      } else {
        return res.status(400).json({
          error: 'Invalid type. Valid values are "comment" or "reply".',
        });
      }

      // Вычисляем общее количество страниц
      const totalPages = Math.ceil(totalItems / limitInt);

      // Возвращаем данные и мета-данные для пагинации
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
