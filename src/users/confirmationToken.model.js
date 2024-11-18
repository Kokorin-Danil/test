import { DataTypes, Model } from 'sequelize';
import dbPosts from '../../db.js';
import User from './users.model.js'; // Импорт модели пользователя

class ConfirmationToken extends Model {}

ConfirmationToken.init(
  {
    token: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize: dbPosts,
    modelName: 'ConfirmationToken',
    tableName: 'confirmation_tokens',
  }
);

// Связь с пользователем
User.hasMany(ConfirmationToken, { foreignKey: 'userId' });
ConfirmationToken.belongsTo(User, { foreignKey: 'id' });

// ConfirmationToken.sync({ alter: true })
//   .then(() => {
//     console.log('ConfirmationToken table created successfully');
//   })
//   .catch((error) => {
//     console.error('Error creating ConfirmationToken table:', error);
//   });

export default ConfirmationToken;
