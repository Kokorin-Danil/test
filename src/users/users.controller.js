import { Sequelize, DataTypes, Model, useInflection } from 'sequelize';
import bcrypt from 'bcryptjs';
import User from './users.model.js';
import jwt, { decode } from 'jsonwebtoken';
import { config } from '../../config.js';
import nodemailer from 'nodemailer';

const ACCESS_TOKEN_EXPIRES = '10m'; // 15 минут
const REFRESH_TOKEN_EXPIRES = '30d'; // 30 дней

class UsersController {
  async register(req, res) {
    const { name, surname, email, password } = req.body;

    if (!name || !surname || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    try {
      // Хешируем пароль
      const hashedPassword = await bcrypt.hash(password, 10);

      // Создаем пользователя с статусом "inactive"
      const newUser = await User.create({
        name,
        surname,
        email,
        password: hashedPassword,
        status: 'inactive',
      });

      // Генерируем токен для подтверждения email
      const token = jwt.sign(
        { userId: newUser.id },
        config.EMAIL_CONFIRM_SECRET,
        { expiresIn: '1h' }
      );

      // Отправляем письмо с подтверждением
      const transporter = nodemailer.createTransport({
        host: 'smtp.yandex.ru',
        port: 465,
        secure: true,
        auth: {
          user: config.EMAIL,
          pass: config.EMAIL_PASSWORD,
        },
        debug: true, // Включаем отладку
        logger: true, // Логи работы SMTP
      });

      const confirmUrl = `http://localhost:3001/api/users/confirm/${token}`;

      const mailOptions = {
        from: config.EMAIL,
        to: newUser.email,
        subject: 'Confirm your email',
        html: `<p>Click the link to confirm your registration: <a href="${confirmUrl}">Confirm Email</a></p>`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
          return res
            .status(500)
            .json({ error: 'Error sending confirmation email' });
        } else {
          res.status(201).json({
            message:
              'Registration successful! Please check your email to confirm.',
          });
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async confirmEmail(req, res) {
    const { token } = req.params;

    try {
      // Проверяем токен
      const decoded = jwt.verify(token, config.EMAIL_CONFIRM_SECRET);
      const user = await User.findOne({
        where: { status: 'inactive', id: decoded.userId },
      });

      if (!user) {
        return res.status(404).json({ error: 'Incorrect token' });
      }

      // Обновляем статус пользователя на "active"
      if (user.status === 'active') {
        return res.status(400).json({ message: 'User is already active' });
      }

      user.status = 'active';
      await user.save();

      res.json({ message: 'Email confirmed! Your account is now active.' });
    } catch (error) {
      res.status(500).json({ error: 'Invalid or expired token' });
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
