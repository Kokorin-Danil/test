import dbPosts from '../../db.js';
import { DataTypes, Model } from 'sequelize';
import User from '../users/users.model.js'; // Импортируем модель пользователя

class Posts extends Model {}

Posts.init(
  {
    label: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    file: {
      type: DataTypes.STRING,
    },
    userId: {
      type: DataTypes.INTEGER, // Внешний ключ для привязки к пользователю
      allowNull: false,
      references: {
        model: User, // Ссылка на модель User
        key: 'id', // Связь с полем id пользователя
      },
      onDelete: 'CASCADE', // Удаление поста при удалении пользователя
    },
  },
  {
    sequelize: dbPosts,
    modelName: 'Posts',
    tableName: 'posts',
    timestamps: false,
  }
);

// Связь между пользователем и постами (Один пользователь имеет много постов)
User.hasMany(Posts, { foreignKey: 'userId' });
Posts.belongsTo(User, { foreignKey: 'id' });

Posts.sync({ alter: true })
  .then(() => {
    console.log('Posts table created successfully with userId!');
  })
  .catch((err) => {
    console.error('Error creating Posts table:', err);
  });

export default Posts;
