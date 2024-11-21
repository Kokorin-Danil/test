import express from 'express';
import activityController from './activity.controller.js';
import middlewaresController from '../middlewares/middlewares.controller.js';

const activityRouter = express.Router();

// Лайк
activityRouter.post(
  '/:type/:id/like', // типы: post, comment, reply
  middlewaresController.authenticateToken,
  activityController.toggleLike
);

// Создание комментариев
activityRouter.post(
  '/:type/:id/comment', // типы: post, comment, reply
  middlewaresController.authenticateToken,
  activityController.createCommentOrReply
);
// Получение количества лайков
activityRouter.get(
  '/:type/:id/likeCount', // типы: post, comment, reply
  middlewaresController.authenticateToken,
  activityController.getLikeCount
);
// Получение комментариев
activityRouter.get(
  '/:id/:type/comments', //типы: comment, reply
  activityController.getCommentsAndReplies
);

export default activityRouter;
