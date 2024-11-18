import express from 'express';
import usersRouter from './src/users/users.router.js';
import postsRouter from './src/posts/posts.router.js';
import dbPosts from './db.js';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer } from 'http';
import { initWebSocket } from './websocket.js';
import middlewaresController from './src/middlewares/middlewares.controller.js';
import commentsRouter from './src/comments/comments.router.js';

dotenv.config();

const app = express();
const server = createServer(app);

// Инициализируем WebSocket сервер
const { broadcastNewPost } = initWebSocket(server); // Инициализация WebSocket

app.get('/', (req, res) => {
  res.send('WebSocket Server is running');
});

app.use(express.json());
app.use('/public', express.static('./public'));

app.use(cors());

app.use('/api/users', usersRouter);
app.use('/api/posts', postsRouter);
app.use('/api/comments', commentsRouter);

dbPosts.sync({ alter: true }).then(() => {
  server.listen(3001, () => {
    // Обратите внимание на использование server, а не app.listen()
    console.clear();
    console.log('Server is running on port 3001');
    console.log('WebSocket server is running');
  });
});

export { broadcastNewPost };
