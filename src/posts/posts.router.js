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

// Функция для проверки формата файла
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']; // Допустимые MIME-типы
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true); // Разрешить файл
  } else {
    cb(new Error('Only .jpg, .jpeg, and .png formats are allowed'), false); // Отклонить файл
  }
};

// Инициализируем multer с проверкой типа файла
const upload = multer({
  storage: storage,
  fileFilter: fileFilter, // Применяем проверку формата файла
});

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
