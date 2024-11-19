import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { config } from './config.js';

let wss;

export function initWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const params = new URLSearchParams(req.url.split('?')[1]);
    const token = params.get('token');

    if (!token) {
      ws.close(1008, 'Authentication required');
      console.log('Connection rejected: no token provided');
      return;
    }

    jwt.verify(token, config.ACCESS_TOKEN_SECRET, (err, user) => {
      if (err) {
        ws.close(1008, 'Invalid token');
        console.log('Connection rejected: invalid token');
        return;
      }

      console.log('Decoded user from JWT:', user);

      // Назначаем пользователя WebSocket соединению
      ws.user = { id: user.userId, role: user.role }; // Исправлено: сохраняем userId и другие данные
      console.log(`User connected: ${ws.user.id}`); // Проверяем, что id присутствует
    });
  });
}

// Уведомление конкретного пользователя
export function notifyUser(userId, data) {
  const message = JSON.stringify(data);

  console.log(`Attempting to notify user ${userId} with data:`, data);

  let userNotified = false;

  wss.clients.forEach((client) => {
    console.log(
      `Checking client: user=${client.user?.id}, readyState=${client.readyState}`
    );

    if (
      client.readyState === WebSocket.OPEN &&
      client.user &&
      client.user.id === userId
    ) {
      console.log(`Notifying user ${userId}:`, message);
      client.send(message);
      userNotified = true;
    }
  });

  if (!userNotified) {
    console.log(`No active WebSocket connection found for user ${userId}`);
  }
}

// Уведомление всех о новом посте
export function broadcastNewPost(postData) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: 'new_post',
          message: `A new post titled "${postData.title}" has been created!`,
          data: postData,
        })
      );
    }
  });
}
