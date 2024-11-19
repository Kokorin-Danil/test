import express from 'express';
import activityController from './activity.controller.js';
import middlewaresController from '../middlewares/middlewares.controller.js';

const activityRouter = express.Router();

// Лайк на пост
activityRouter.post(
  '/:postId/like',
  middlewaresController.authenticateToken,
  activityController.toggleLikeOnPost
);

// Комментарий к посту
activityRouter.post(
  '/:postId/comment',
  middlewaresController.authenticateToken,
  activityController.createComment
);

// Лайк на комментарий
activityRouter.post(
  '/comment/:commentId/like',
  middlewaresController.authenticateToken,
  activityController.toggleLikeOnComment
);

// Ответ на комментарий
activityRouter.post(
  '/:commentId/reply',
  middlewaresController.authenticateToken,
  activityController.createReply
);

// Получение количества лайков на пост
activityRouter.get(
  '/:postId/likeCountPost',
  activityController.getLikeCountOnPost
);

// Получение количества лайков на комментарий
activityRouter.get(
  '/:id/likeCountComment',
  activityController.getLikeCountOnComment
);

export default activityRouter;
