import Activity from './activity.model.js';
import Posts from '../posts/posts.model.js';
import User from '../users/users.model.js';
import { Op } from 'sequelize';
import { notifyUser } from '../../websocket.js';

class ActivityController {
  // Лайк на пост
  async toggleLikeOnPost(req, res) {
    const { postId } = req.params;
    const { userId } = req.user; // Извлекаем userId из токена

    try {
      // Проверка, что пост существует
      const post = await Posts.findByPk(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Проверка, существует ли уже активность "like" от данного пользователя для этого поста
      const existingLike = await Activity.findOne({
        where: { type: 'like', postId, userId },
      });

      if (existingLike) {
        // Если лайк существует, удаляем его
        await existingLike.destroy();

        // Уменьшаем количество лайков на посте
        post.likes -= 1;
        await post.save();

        return res.status(200).json({ message: 'Unliked the post' });
      } else {
        // Если лайк не существует, добавляем его
        await Activity.create({
          type: 'like',
          userId,
          postId,
        });

        if (post.userId !== userId) {
          console.log(
            `Sending notification to user ${post.userId} about new like...`
          );
          notifyUser(post.userId, {
            type: 'new_like',
            message: `Ваш пост получил новый лайк!`,
            data: {
              postId: post.id,
              likedBy: {
                userId,
                username: req.user.name, // Убедитесь, что это свойство есть в токене
              },
              timestamp: new Date().toISOString(),
            },
          });
        }

        // Увеличиваем количество лайков на посте
        post.likes += 1;
        await post.save();

        return res.status(200).json({ message: 'Liked the post' });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error while toggling the like' });
    }
  }

  // Создание комментария
  async createComment(req, res) {
    const { postId } = req.params;
    const { content } = req.body;
    const { userId } = req.user;

    try {
      // Проверяем, что пост существует
      const post = await Posts.findByPk(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Создаем запись о комментарии как активность
      const activity = await Activity.create({
        type: 'comment',
        userId,
        postId,
        content,
      });

      // Увеличиваем количество комментариев на посте
      post.commentCount += 1;
      await post.save();

      // Отправляем уведомление создателю поста
      if (post.userId !== userId) {
        notifyUser(post.userId, {
          type: 'new_comment',
          message: `Ваш пост получил новый комментарий: "${content}"`,
          data: {
            postId: post.id,
            commentId: activity.id,
            commentedBy: {
              userId,
              username: req.user.username, // Убедитесь, что это свойство есть в токене
            },
            timestamp: new Date().toISOString(),
          },
        });
      }

      res.status(201).json({ message: 'Comment added', activity });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error while adding the comment' });
    }
  }

  // Лайк на комментарий
  async toggleLikeOnComment(req, res) {
    const { commentId } = req.params; // Получаем id комментария
    const { userId } = req.user; // Получаем id пользователя

    try {
      // Проверяем, что это комментарий или ответ
      const comment = await Activity.findOne({
        where: {
          id: commentId,
          type: ['comment', 'reply'], // Только комментарии или ответы
        },
      });

      if (!comment) {
        return res.status(404).json({ error: 'Comment or reply not found' });
      }

      // Проверяем, есть ли уже лайк от этого пользователя
      const like = await Activity.findOne({
        where: {
          userId,
          type: 'like', // Тип активности лайк
          commentId,
        },
      });

      if (like) {
        // Если лайк уже существует, удаляем его
        await like.destroy();
        return res.status(200).json({ message: 'Like removed from comment' });
      }

      // Если лайк не найден, создаём новый лайк
      await Activity.create({
        type: 'like',
        userId,
        commentId,
      });

      res.status(200).json({ message: 'Like added to comment' });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ error: 'Error while liking or unliking the comment' });
    }
  }

  // Ответ на комментарий
  async createReply(req, res) {
    const { commentId } = req.params;
    const { content } = req.body;
    const { userId } = req.user;

    try {
      const comment = await Activity.findByPk(commentId);
      if (!comment || comment.type !== 'comment') {
        return res.status(404).json({ error: 'Comment not found' });
      }

      // Создаем ответ как активность
      const reply = await Activity.create({
        type: 'reply',
        userId,
        commentId,
        content,
      });

      res.status(201).json({ message: 'Reply added', reply });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error while adding the reply' });
    }
  }

  // Получение количества лайков на пост
  async getLikeCountOnPost(req, res) {
    const { postId } = req.params; // Получаем postId из параметров

    try {
      // Проверяем, существует ли пост с таким ID
      const post = await Posts.findByPk(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Считаем количество лайков только на этом посте
      const likeCount = await Activity.count({
        where: {
          postId,
          type: 'like', // Только лайки
        },
      });

      res.status(200).json({ likeCount });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error while getting like count on post' });
    }
  }

  // Получение количества лайков на комментарии
  async getLikeCountOnComment(req, res) {
    const { id } = req.params; // Получаем ID из параметров маршрута

    // Проверяем, передан ли параметр ID
    if (!id) {
      return res.status(400).json({ error: 'The ID parameter is required.' });
    }

    try {
      // Проверяем, существует ли активность с таким ID и что это "comment" или "reply"
      const activity = await Activity.findOne({
        where: {
          id: Number(id), // Убедимся, что ID передан как число
          type: {
            [Op.in]: ['comment', 'reply'], // Тип должен быть "comment" или "reply"
          },
        },
      });

      if (!activity) {
        return res.status(404).json({
          error: 'The specified ID does not correspond to a comment or reply.',
        });
      }

      // Считаем количество лайков для указанного комментария или ответа
      const likeCount = await Activity.count({
        where: {
          commentId: id,
          type: 'like',
        },
      });

      res.status(200).json({ likeCount });
    } catch (err) {
      console.error('Error while getting like count:', err);
      res.status(500).json({ error: 'Error while getting like count' });
    }
  }
}

// Экспортируем экземпляр класса ActivityController
export default new ActivityController();
