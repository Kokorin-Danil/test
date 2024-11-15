import { Sequelize, DataTypes, Model, useInflection } from 'sequelize';
import dbPosts from '../../db.js';

class User extends Model {}

User.init(
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    surname: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    refreshToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      defaultValue: 'user',
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'), // Добавляем поле для статуса
      defaultValue: 'inactive', // Изначально пользователь не активен
    },
  },
  {
    sequelize: dbPosts,
    modelName: 'User',
    tableName: 'users',
    indexes: [{ fields: ['email'], unique: true }],
  }
);

User.sync({ alter: true })
  .then(() => {
    console.log('User table created successfully');
  })
  .catch((err) => {
    console.error('Error creating User table:', err);
  });

export default User;
