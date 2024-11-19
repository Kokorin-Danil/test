import { Router } from 'express';
import postsController from './posts.controller.js';
import middlewaresController from '../middlewares/middlewares.controller.js';
import upload from '../../utils/multerConfig.js';

const postsRouter = new Router();

postsRouter.get('/', postsController.getPosts);
postsRouter.get(
  '/:postId',
  middlewaresController.authenticateToken,
  postsController.viewPost
); // Используем viewPost для просмотра
postsRouter.post(
  '/',
  middlewaresController.authenticateToken, // Проверка токена
  upload.single('file'), // Обработка файла
  postsController.createPost // Метод для создания поста
);
postsRouter.put(
  '/:id',
  middlewaresController.authenticateToken,
  upload.single('file'),
  postsController.updatePost
);

export default postsRouter;
