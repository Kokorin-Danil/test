import { DataTypes, Model } from 'sequelize';
import dbPosts from '../../db.js';
import User from '../users/users.model.js';
import Comments from './comments.model.js';

class CommentLike extends Model {}

CommentLike.init(
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      onDelete: 'CASCADE', // Лайки удаляются, если пользователь удален
    },
    commentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Comments,
        key: 'id',
      },
      onDelete: 'CASCADE', // Лайки удаляются, если комментарий удален
    },
  },
  {
    sequelize: dbPosts,
    modelName: 'CommentLike',
    tableName: 'comment_likes',
    timestamps: true, // Добавляем поля createdAt и updatedAt
  }
);

// Определение связей
User.hasMany(CommentLike, { foreignKey: 'userId', onDelete: 'CASCADE' });
Comments.hasMany(CommentLike, { foreignKey: 'commentId', onDelete: 'CASCADE' });
CommentLike.belongsTo(User, { foreignKey: 'userId' });
CommentLike.belongsTo(Comments, { foreignKey: 'commentId' });

export default CommentLike;
