import { Sequelize, DataTypes, Model, useInflection } from 'sequelize';
import bcrypt from 'bcryptjs';
import User, { ConfirmationToken } from './users.model.js';
import jwt, { decode } from 'jsonwebtoken';
import { config } from '../../config.js';
import nodemailer from 'nodemailer';

const ACCESS_TOKEN_EXPIRES = '10m'; // 15 минут
const REFRESH_TOKEN_EXPIRES = '30d'; // 30 дней

class UsersController {
  async register(req, res) {
    const { name, surname, email, password } = req.body;

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      // Создаем пользователя
      const newUser = await User.create({
        name,
        surname,
        email,
        password: hashedPassword,
        status: 'inactive',
      });

      // Генерируем токен с временем жизни 5 минут
      const token = jwt.sign(
        { userId: newUser.id },
        config.EMAIL_CONFIRM_SECRET,
        { expiresIn: '5m' }
      );

      // Сохраняем токен в базе данных
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Токен действует 5 минут
      await ConfirmationToken.create({
        token,
        userId: newUser.id,
        expiresAt,
      });

      // Отправляем письмо
      const transporter = nodemailer.createTransport({
        host: 'smtp.yandex.ru',
        port: 465,
        secure: true,
        auth: {
          user: config.EMAIL,
          pass: config.EMAIL_PASSWORD,
        },
      });

      const confirmUrl = `http://localhost:3001/api/users/confirm/${token}`;
      await transporter.sendMail({
        from: config.EMAIL,
        to: newUser.email,
        subject: 'Confirm your email',
        html: `<p>Click the link to confirm your email: <a href="${confirmUrl}">Confirm Email</a></p>`,
      });

      res.status(201).json({
        message: 'Registration successful! Please check your email to confirm.',
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async confirmEmail(req, res) {
    const { token } = req.params;

    try {
      // Ищем токен в базе данных
      const confirmationToken = await ConfirmationToken.findOne({
        where: { token },
      });

      if (!confirmationToken) {
        return res.status(404).json({ error: 'Invalid or expired token' });
      }

      // Проверяем, не истёк ли токен
      if (confirmationToken.expiresAt < new Date()) {
        return res.status(400).json({ error: 'Token has expired' });
      }

      // Активируем пользователя
      const user = await User.findByPk(confirmationToken.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      user.status = 'active';
      await user.save();

      // Удаляем токен после использования
      await confirmationToken.destroy();

      res.json({
        message: 'Email confirmed successfully! Your account is now active.',
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async resendConfirmationEmail(req, res) {
    const { email } = req.body;

    try {
      // Проверяем, существует ли пользователь
      const user = await User.findOne({ where: { email } });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Проверяем, активирован ли пользователь
      if (user.status === 'active') {
        return res.status(400).json({ error: 'User is already active' });
      }

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Ищем существующий токен
      const existingToken = await ConfirmationToken.findOne({
        where: { userId: user.id },
      });

      if (existingToken) {
        // Если токен истёк, удаляем его
        if (existingToken.expiresAt < new Date()) {
          await existingToken.destroy();
        } else {
          // Если токен всё ещё активен, возвращаем сообщение
          return res.status(400).json({
            error: 'A confirmation email was already sent. Please wait.',
          });
        }
      }

      // Генерируем новый токен
      const token = jwt.sign({ userId: user.id }, config.EMAIL_CONFIRM_SECRET, {
        expiresIn: '5m',
      });
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Токен действует 5 минут

      // Сохраняем новый токен в базе данных
      await ConfirmationToken.create({
        token,
        userId: user.id,
        expiresAt,
      });

      // Отправляем письмо с подтверждением
      const transporter = nodemailer.createTransport({
        host: 'smtp.yandex.ru',
        port: 465,
        secure: true,
        auth: {
          user: config.EMAIL,
          pass: config.EMAIL_PASSWORD,
        },
      });

      const confirmUrl = `http://localhost:3001/api/users/confirm/${token}`;
      await transporter.sendMail({
        from: config.EMAIL,
        to: user.email,
        subject: 'Confirm your email',
        html: `<p>Click the link to confirm your email: <a href="${confirmUrl}">Confirm Email</a></p>`,
      });

      res
        .status(200)
        .json({ message: 'Confirmation email sent successfully!' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async login(req, res) {
    const { email, password } = req.body;

    try {
      const user = await User.findOne({ where: { email } });

      if (!user || user.status !== 'active') {
        return res
          .status(401)
          .json({ error: 'Account is not activated or user does not exist' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Генерируем токены с добавлением роли
      const accessToken = jwt.sign(
        { userId: user.id, role: user.role }, // Добавляем `role`
        config.ACCESS_TOKEN_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRES }
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        config.REFRESH_TOKEN_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRES }
      );

      await user.update({ refreshToken }); // Сохраняем refresh token

      res.json({ accessToken, refreshToken });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async refresh(req, res) {
    const refreshToken = req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token is required' });
    }

    try {
      const decoded = jwt.verify(refreshToken, config.REFRESH_TOKEN_SECRET);
      const user = await User.findOne({
        where: { id: decoded.userId, refreshToken },
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      // Генерируем новый access и refresh токены
      const newAccessToken = jwt.sign(
        { userId: user.id },
        config.ACCESS_TOKEN_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRES }
      );

      const newRefreshToken = jwt.sign(
        { userId: user.id },
        config.REFRESH_TOKEN_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRES }
      );

      // Обновляем refresh токен пользователя в БД
      await user.update({ refreshToken: newRefreshToken });

      res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Refresh token expired' });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async getUsers(req, res) {
    const userRole = req.user.role; // Роль текущего пользователя из токена

    // Если роль пользователя "user", возвращаем ошибку доступа
    if (userRole === 'user') {
      return res
        .status(403)
        .json({ error: 'Access denied. Insufficient permissions.' });
    }

    try {
      // Если роль администратора, возвращаем всех пользователей
      const users = await User.findAll();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getUserProfile(req, res) {
    const userId = req.user.userId; // Идентификатор текущего пользователя из токена

    try {
      const user = await User.findOne({ where: { id: userId } });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user); // Отдаем только данные текущего пользователя
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateProfile(req, res) {
    const userId = req.user.userId; // Получаем ID текущего пользователя
    const { name, surname, email, password, confirmPassword } = req.body; // Извлекаем данные из запроса

    try {
      const user = await User.findByPk(userId); // Находим пользователя по ID

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Если пользователь хочет обновить пароль
      if (password || confirmPassword) {
        // Проверяем, что оба поля для пароля заполнены
        if (!password || !confirmPassword) {
          return res
            .status(400)
            .json({ error: 'Both password and confirmPassword are required' });
        }

        // Проверяем, что пароли совпадают
        if (password !== confirmPassword) {
          return res.status(400).json({ error: 'Passwords do not match' });
        }

        // Хешируем новый пароль
        const hashedPassword = await bcrypt.hash(password, 10);
        await user.update({ password: hashedPassword });
      }

      // Обновляем другие данные пользователя
      await user.update({
        name: name || user.name,
        surname: surname || user.surname,
        email: email || user.email,
      });

      res.json({ message: 'Profile updated successfully', user });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new UsersController();
