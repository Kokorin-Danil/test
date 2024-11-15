import { Sequelize, DataTypes, Model, useInflection } from 'sequelize';
import bcrypt from 'bcryptjs';
import User from './users.model.js';
import jwt from 'jsonwebtoken';
import { config } from '../../config.js';

const ACCESS_TOKEN_EXPIRES = '10m'; // 15 минут
const REFRESH_TOKEN_EXPIRES = '30d'; // 30 дней

class UsersController {
  async register(req, res) {
    const { name, surname, email, password } = req.body;

    if (
      typeof name !== 'string' ||
      typeof surname !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string'
    ) {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await User.create({
        name,
        surname,
        email,
        password: hashedPassword,
      });

      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        res.status(400).json({ error: 'Email already exists' });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async login(req, res) {
    const { email, password } = req.body;

    try {
      const user = await User.findOne({ where: { email } });

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
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
