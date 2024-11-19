import dbPosts from '../../db.js';
import { DataTypes, Model } from 'sequelize';
import User from '../users/users.model.js'; // Модель пользователя
import Posts from '../posts/posts.model.js'; // Модель поста

class Activity extends Model {}

Activity.init(
  {
    type: {
      type: DataTypes.STRING, // Тип активности, например, "like", "comment", "reply"
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User, // Связь с пользователем
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    postId: {
      type: DataTypes.INTEGER,
      references: {
        model: Posts, // Связь с постами
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    commentId: {
      type: DataTypes.INTEGER,
      references: {
        model: Activity, // Ответы на комментарии тоже сохраняются как активности
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    ip: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    content: {
      type: DataTypes.TEXT, // Текст комментария или ответ
    },
  },
  {
    sequelize: dbPosts,
    modelName: 'Activity',
    tableName: 'activities',
    timestamps: true, // Включаем временные метки
  }
);

// Связь между Activity и пользователями, постами и комментариями
Posts.hasMany(Activity, { foreignKey: 'postId' });
Activity.belongsTo(Posts, { foreignKey: 'postId' });
User.hasMany(Activity, { foreignKey: 'userId' });
Activity.belongsTo(User, { foreignKey: 'userId' });

export default Activity;
