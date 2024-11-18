import { DataTypes, Model } from 'sequelize';
import dbPosts from '../../db.js';
import User from '../users/users.model.js';
import Posts from './posts.model.js';

class PostLike extends Model {}

PostLike.init(
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    postId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Posts,
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
  },
  {
    sequelize: dbPosts,
    modelName: 'PostLike',
    tableName: 'post_likes',
    timestamps: false,
  }
);

// Устанавливаем связи
User.belongsToMany(Posts, { through: PostLike, foreignKey: 'userId' });
Posts.belongsToMany(User, { through: PostLike, foreignKey: 'postId' });

export default PostLike;
