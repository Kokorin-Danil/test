import jwt from 'jsonwebtoken';
import { config } from '../../config.js';
import fs from 'fs/promises';
import path from 'path';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, config.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    req.user = user; // Сохраняем `role` из токена в `req.user`
    next();
  });
};

const authorizeRole = (role) => (req, res, next) => {
  if (req.user.role === role) {
    next();
  } else {
    return res.status(403).json({ error: 'Unauthorized' });
  }
};

export default { authenticateToken, authorizeRole };
