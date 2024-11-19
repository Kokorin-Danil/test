import express from 'express';
import usersRouter from './src/users/users.router.js';
import postsRouter from './src/posts/posts.router.js';
import dbPosts from './db.js';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer } from 'http';
import middlewaresController from './src/middlewares/middlewares.controller.js';
import activityRouter from './src/activity/activity.router.js'; // Подключаем маршруты активности
import { initWebSocket, broadcastNewPost } from './websocket.js';

dotenv.config();

const app = express();
const server = createServer(app);

// Инициализируем WebSocket сервер
initWebSocket(server);

export { broadcastNewPost };

app.get('/', (req, res) => {
  res.send('WebSocket Server is running');
});

app.use(express.json());
app.use('/public', express.static('./public')); // Статические файлы

app.use(cors());

// Использование маршрутов
app.use('/api/users', usersRouter);
app.use('/api/posts', postsRouter);
app.use('/api/activity', activityRouter); // Маршруты для активности

// Синхронизация базы данных
dbPosts.sync({ alter: true }).then(() => {
  // После синхронизации базы данных запускаем сервер
  server.listen(3001, () => {
    console.clear();
    console.log('Server is running on port 3001');
    console.log('WebSocket server is running');
  });
});
