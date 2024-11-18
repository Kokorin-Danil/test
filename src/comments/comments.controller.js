import Comments from './comments.model.js';
import Posts from '../posts/posts.model.js';
import CommentLike from './commentLike.model.js';

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

      const newComment = await Comments.create({ text, postId, userId });
      res.status(201).json(newComment);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getComments(req, res) {
    const { postId } = req.params;

    try {
      const comments = await Comments.findAll({ where: { postId } });
      res.status(200).json(comments);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  async likeComment(req, res) {
    const { commentId } = req.params;
    const userId = req.user.userId; // Извлекаем userId из токена

    try {
      const comment = await Comments.findByPk(commentId);

      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      // Проверяем, поставил ли пользователь лайк
      const existingLike = await CommentLike.findOne({
        where: { commentId, userId },
      });

      if (existingLike) {
        // Если лайк уже поставлен, удаляем его
        await existingLike.destroy();
        return res.status(200).json({ message: 'Like removed' });
      }

      // Если лайк не был поставлен, создаем новый лайк
      await CommentLike.create({ commentId, userId });

      res.status(201).json({ message: 'Like added' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  async isUserActivated(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }
    if (!user.isActivated) {
      throw new Error('User account is not activated');
    }
    return true;
  }
}

export default new CommentsController();
