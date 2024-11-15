import Posts from './posts.model.js';
import multer from 'multer';
import path from 'path';
import uniqid from 'uniqid';
import fs from 'fs';

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

  async getPostById(req, res) {
    const id = req.params.id;
    try {
      const post = await Posts.findByPk(id);
      if (post) {
        res.json(post);
      } else {
        res.status(404).json({ error: 'Post not found' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async createPost(req, res) {
    const { label, text } = req.body; // Извлекаем текстовые поля
    const userId = req.user.userId; // Получаем ID текущего пользователя из токена

    // Проверка, если обязательные поля не переданы
    if (!label || !text) {
      return res.status(400).json({ error: 'Label and text are required' });
    }

    try {
      // Создаем пост с обязательными полями и файлом (если он загружен)
      const newPost = await Posts.create({
        label,
        text,
        userId, // Привязываем пост к пользователю
        file: req.file ? `/uploads/${req.file.filename}` : null, // Обрабатываем файл, если он есть
      });
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
    const updatedData = req.body; // Новые данные для поста

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

      // Если загружен новый файл, удаляем старый файл (если он есть)
      if (req.file) {
        if (post.file) {
          const oldFilePath = path.join('public', post.file); // Путь к старому файлу
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath); // Удаляем старый файл
          }
        }

        // Обновляем данные поста, включая новый файл
        updatedData.file = `/uploads/${req.file.filename}`;
      }

      // Обновляем пост с новыми данными
      await post.update(updatedData);

      res.json({ message: 'Post updated successfully', post });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new PostsController();
