import { Sequelize, DataTypes, Model } from 'sequelize';
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
      unique: true, // Уникальность email
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
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'inactive',
    },
  },
  {
    sequelize: dbPosts,
    modelName: 'User',
    tableName: 'users',
    indexes: [{ fields: ['email'], unique: true }],
  }
);

class ConfirmationToken extends Model {}

ConfirmationToken.init(
  {
    token: {
      type: DataTypes.STRING,
      allowNull: false,
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

// Связь: один пользователь может иметь несколько токенов
User.hasMany(ConfirmationToken, {
  foreignKey: 'userId',
  as: 'confirmationTokens',
});
ConfirmationToken.belongsTo(User, { foreignKey: 'id' });

export default User;
export { ConfirmationToken };
