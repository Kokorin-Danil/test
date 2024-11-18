import { DataTypes, Model } from 'sequelize';
import dbPosts from '../../db.js';
import Posts from '../posts/posts.model.js';
import User from '../users/users.model.js';

class Comments extends Model {}

Comments.init(
  {
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
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
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
  },
  {
    sequelize: dbPosts,
    modelName: 'Comments',
    tableName: 'comments',
    timestamps: true,
  }
);

Posts.hasMany(Comments, { foreignKey: 'postId' });
Comments.belongsTo(Posts, { foreignKey: 'postId' });
User.hasMany(Comments, { foreignKey: 'userId' });
Comments.belongsTo(User, { foreignKey: 'userId' });

export default Comments;
