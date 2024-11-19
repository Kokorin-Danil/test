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
  '/:commentId/like',
  middlewaresController.authenticateToken,
  commentsController.likeComment
);
commentsRouter.post(
  '/:commentId/reply', // Маршрут для ответа на комментарий
  middlewaresController.authenticateToken, // Проверка авторизации
  commentsController.replyToComment // Контроллер для ответа
);

export default commentsRouter;
