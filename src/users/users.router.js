import { Router } from 'express';
import usersController from './users.controller.js';
import middlewaresController from '../middlewares/middlewares.controller.js';

const usersRouter = new Router();

usersRouter.post('/register', usersController.register);
usersRouter.get('/confirm/:token', usersController.confirmEmail); // Маршрут для подтверждения email
usersRouter.post(
  '/resend-confirmation',
  usersController.resendConfirmationEmail
);
usersRouter.post('/login', usersController.login);
usersRouter.post('/refresh', usersController.refresh);
usersRouter.get(
  '/profile',
  middlewaresController.authenticateToken, // Проверка токена для любого авторизованного пользователя
  usersController.getUserProfile // Возвращаем профиль текущего пользователя
);
usersRouter.get(
  '/',
  middlewaresController.authenticateToken, // Проверка токена
  usersController.getUsers // Администратор видит всех пользователей, остальные получают ошибку
);
usersRouter.put(
  '/profile',
  middlewaresController.authenticateToken, // Проверка токена
  usersController.updateProfile // Метод для обновления профиля
);
export default usersRouter;
