import express from 'express';
import usersRouter from './src/users/users.router.js';
import postsRouter from './src/posts/posts.router.js';
import dbPosts from './db.js';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();

app.use(cors());

app.use(express.json());
app.use('/public', express.static('./public'));
app.use('/api/users', usersRouter);
app.use('/api/posts', postsRouter);

dbPosts.sync({ alter: true }).then(() => {
  app.listen(3001, () => {
    console.log('server is running on port 3001');
  });
});
