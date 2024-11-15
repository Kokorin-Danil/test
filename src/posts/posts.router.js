import { Router } from 'express';
import postsController from './posts.controller.js';
import middlewaresController from '../middlewares/middlewares.controller.js';
import multer from 'multer';
import uniqid from 'uniqid';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads'); // Указываем папку для загрузки файлов
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname); // Получаем расширение файла
    const uniqueId = uniqid(); // Генерируем уникальный идентификатор
    cb(null, `${uniqueId}${extension}`); // Задаем уникальное имя для файла
  },
});
const upload = multer({ storage: storage });

const postsRouter = new Router();

postsRouter.get('/', postsController.getPosts);
postsRouter.get('/:id', postsController.getPostById);
postsRouter.post(
  '/',
  middlewaresController.authenticateToken, // Проверка токена
  upload.single('file'), // Обработка файла
  postsController.createPost // Метод для создания поста
);
postsRouter.put(
  '/:id',
  middlewaresController.authenticateToken, // Проверка токена
  upload.single('file'), // Обработка файла
  postsController.updatePost // Метод для обновления поста
);

export default postsRouter;
