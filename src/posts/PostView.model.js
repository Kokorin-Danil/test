import { DataTypes, Model } from 'sequelize';
import dbPosts from '../../db.js';

class PostView extends Model {}

PostView.init(
  {
    postId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    ip: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize: dbPosts,
    modelName: 'PostView',
    tableName: 'post_views',
    indexes: [
      { unique: true, fields: ['postId', 'ip'] }, // Уникальность пары postId и ip
    ],
  }
);

export default PostView;
