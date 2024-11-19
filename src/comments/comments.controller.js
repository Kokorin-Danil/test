import Comments from './comments.model.js';
import Posts from '../posts/posts.model.js';
import CommentLike from './commentLike.model.js';
import User from '../users/users.model.js';

class CommentsController {
  async createComment(req, res) {
    const { postId } = req.params;
    const { text } = req.body;
    const userId = req.user.userId;

    try {
      const post = await Posts.findByPk(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const newComment = await Comments.create({
        text,
        postId,
        userId,
      });

      // Увеличиваем счетчик комментариев
      post.commentCount += 1;
      await post.save();

      res.status(201).json(newComment);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getComments(req, res) {
    const { postId } = req.params;

    try {
      const comments = await Comments.findAll({
        where: { postId, parentCommentId: null }, // Корневые комментарии
        include: [
          {
            model: Comments,
            as: 'replies', // Ответы на комментарий
            include: {
              model: User,
              attributes: ['id', 'name'], // Информация о пользователе, оставившем ответ
            },
          },
          {
            model: User,
            attributes: ['id', 'name'], // Информация о пользователе, оставившем комментарий
          },
        ],
      });

      res.status(200).json(comments);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async likeComment(req, res) {
    const { commentId } = req.params;
    const userId = req.user.userId;

    try {
      const comment = await Comments.findByPk(commentId);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      const [like, created] = await CommentLike.findOrCreate({
        where: { commentId, userId },
      });

      if (created) {
        // Лайк добавлен, увеличиваем счётчик лайков
        comment.likeCount += 1;
      } else {
        // Лайк удалён, уменьшаем счётчик лайков
        await like.destroy();
        comment.likeCount -= 1;
      }

      await comment.save();
      res
        .status(200)
        .json({ message: 'Like toggled', likeCount: comment.likeCount });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async replyToComment(req, res) {
    const { commentId } = req.params; // ID родительского комментария
    const { text } = req.body;
    const userId = req.user.userId;

    try {
      // Проверяем, существует ли родительский комментарий
      const parentComment = await Comments.findByPk(commentId);

      if (!parentComment) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }

      // Создаём ответ на комментарий
      const reply = await Comments.create({
        text,
        userId,
        postId: parentComment.postId, // Наследуем ID поста от родительского комментария
        parentCommentId: commentId,
      });

      res.status(201).json(reply);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new CommentsController();
