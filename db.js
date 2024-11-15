import { DataTypes, Sequelize } from 'sequelize';
import { config } from './config.js';

const dbPosts = new Sequelize(config.TABLE, 'root', '', {
  host: config.HOST,
  dialect: 'mysql',
  port: config.PORT,
});

export default dbPosts;
