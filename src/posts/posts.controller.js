import Posts from './posts.model.js';
import multer from 'multer';
import path from 'path';
import uniqid from 'uniqid';
import fs from 'fs';
import { broadcastNewPost } from '../../index.js';
import PostView from './PostView.model.js';
import PostLike from './PostLike.model.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads');
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    const uniqueId = uniqid();
    cb(null, `${uniqueId}${extension}`);
  },
});

const upload = multer({ storage: storage });

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

    try {
      const post = await Posts.findByPk(postId);

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Проверяем, был ли этот IP-адрес зарегистрирован
      const [view, created] = await PostView.findOrCreate({
        where: { postId, ip },
      });

      if (created) {
        // Если запись уникальна, увеличиваем счётчик просмотров
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
        return res.status(404).json({ error: 'Post not found' });
      }

      // Проверяем права доступа (только автор или админ может редактировать)
      if (userRole !== 'admin' && post.userId !== userId) {
        return res
          .status(403)
          .json({ error: 'You do not have permission to edit this post' });
      }

      // Если был загружен новый файл
      if (req.file) {
        try {
          // Удаляем старый файл, если он существует
          if (post.file) {
            const oldFilePath = path.join('public', post.file);
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath); // Удаляем старый файл
            }
          }

          // Обновляем данные поста, включая новый файл
          post.file = `/uploads/${req.file.filename}`;
        } catch (fileError) {
          return res
            .status(500)
            .json({ error: 'Error while processing the file' });
        }
      }

      // Обновляем остальные данные поста
      post.label = label || post.label;
      post.text = text || post.text;

      await post.save(); // Сохраняем изменения

      res.json({ message: 'Post updated successfully', post });
    } catch (error) {
      if (error.name === 'SequelizeValidationError') {
        // Если ошибка связана с валидацией в Sequelize
        return res
          .status(400)
          .json({ error: error.errors.map((err) => err.message).join(', ') });
      }

      res.status(500).json({ error: 'An unexpected error occurred' });
    }
  }

  async toggleLike(req, res) {
    const { postId } = req.params;
    const userId = req.user.userId;

    try {
      const post = await Posts.findByPk(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const existingLike = await PostLike.findOne({
        where: { postId, userId },
      });

      if (existingLike) {
        await existingLike.destroy();
        post.likes -= 1; // Уменьшаем счётчик лайков
        await post.save();
        return res.status(200).json({ message: 'Like removed successfully' });
      } else {
        await PostLike.create({ postId, userId });
        post.likes += 1; // Увеличиваем счётчик лайков
        await post.save();
        return res.status(201).json({ message: 'Post liked successfully' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new PostsController();
