import { Router } from 'express';
import commentsController from './comments.controller.js';
import middlewaresController from '../middlewares/middlewares.controller.js';

const commentsRouter = new Router();

commentsRouter.post(
  '/:postId',
  middlewaresController.authenticateToken,
  commentsController.createComment
);
commentsRouter.get('/:postId', commentsController.getComments);
commentsRouter.post(
  '/comments/:commentId/like',
  middlewaresController.authenticateToken,
  commentsController.isUserActivated,
  commentsController.likeComment
);

export default commentsRouter;
