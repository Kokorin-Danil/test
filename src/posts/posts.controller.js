import Posts from './posts.model.js';
import multer from 'multer';
import path from 'path';
import uniqid from 'uniqid';
import fs from 'fs';
import { broadcastNewPost } from '../../index.js';
import Activity from '../activity/activity.model.js';
import upload from '../../utils/multerConfig.js';

class PostsController {
  async getPosts(req, res) {
    try {
      const posts = await Posts.findAll();
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async viewPost(req, res) {
    const { postId } = req.params;
    const ip = req.ip; // Получаем IP клиента
    const userId = req.user ? req.user.userId : null; // Получаем ID пользователя (если авторизован)

    try {
      const post = await Posts.findByPk(postId);

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Проверяем, был ли этот IP-адрес уже зарегистрирован для данного поста
      const existingView = await Activity.findOne({
        where: { postId, ip, type: 'view' },
      });

      if (!existingView) {
        // Если записи нет, увеличиваем количество просмотров
        await Activity.create({
          userId, // Добавляем ID пользователя, если авторизован
          postId,
          type: 'view',
          ip,
        });

        // Увеличиваем счётчик просмотров в модели Posts
        post.views += 1;
        await post.save();
      }

      res.status(200).json(post);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async createPost(req, res) {
    const { label, text } = req.body;
    const userId = req.user.userId;

    try {
      // Проверяем, был ли загружен файл
      if (!req.file) {
        return res
          .status(400)
          .json({ error: 'File is required and must be .jpg, .jpeg, or .png' });
      }

      // Проверяем тип файла
      const validExtensions = ['.jpg', '.jpeg', '.png'];
      const fileExtension = req.file.originalname.split('.').pop();
      if (!validExtensions.includes(`.${fileExtension}`)) {
        return res
          .status(400)
          .json({ error: 'File must be .jpg, .jpeg, or .png' });
      }

      // Создаем пост
      const newPost = await Posts.create({
        label,
        text,
        userId,
        file: `/uploads/${req.file.filename}`,
      });

      // Отправляем WebSocket уведомление
      broadcastNewPost({
        id: newPost.id,
        label: newPost.label,
        text: newPost.text,
        userId: newPost.userId,
        file: newPost.file,
      });

      // Отправляем ответ клиенту
      res.status(201).json(newPost);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getFile(req, res) {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '..', 'public', filename);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  }

  async updatePost(req, res) {
    const postId = req.params.id; // ID поста
    const userId = req.user.userId; // ID текущего пользователя
    const userRole = req.user.role; // Роль пользователя
    const { label, text } = req.body; // Новые данные для поста

    try {
      // Находим пост по ID
      const post = await Posts.findByPk(postId);

      if (!post) {
        // Если пост не найден, удаляем файл, если он был загружен
        if (req.file) {
          fs.unlinkSync(path.join('public', 'uploads', req.file.filename));
        }
        return res.status(404).json({ error: 'Post not found' });
      }

      // Проверяем права доступа (только автор или админ может редактировать)
      if (userRole !== 'admin' && post.userId !== userId) {
        if (req.file) {
          fs.unlinkSync(path.join('public', 'uploads', req.file.filename));
        }
        return res
          .status(403)
          .json({ error: 'You do not have permission to edit this post' });
      }

      // Если был загружен новый файл
      if (req.file) {
        // Удаляем старый файл, если он существует
        if (post.file) {
          const oldFilePath = path.join('public', post.file);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }
        post.file = `/uploads/${req.file.filename}`;
      }

      // Обновляем другие данные поста
      if (label) post.label = label;
      if (text) post.text = text;

      await post.save(); // Сохраняем изменения

      res.status(200).json(post); // Отправляем обновлённый пост
    } catch (error) {
      // Если произошла ошибка, удаляем загруженный файл
      if (req.file) {
        fs.unlinkSync(path.join('public', 'uploads', req.file.filename));
      }
      res.status(500).json({ error: error.message }); // Отправляем ошибку
    }
  }
}

export default new PostsController();
