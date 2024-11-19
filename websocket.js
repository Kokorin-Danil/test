import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { config } from './config.js';

export function initWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Обработчик для новых подключений
  wss.on('connection', (ws, req) => {
    // Получаем токен из параметров запроса
    const params = new URLSearchParams(req.url.split('?')[1]);
    const token = params.get('token');

    if (!token) {
      // Закрываем соединение, если токен отсутствует
      ws.close(1008, 'Authentication required');
      console.log('Connection rejected: no token provided');
      return;
    }

    // Проверяем токен
    jwt.verify(token, config.ACCESS_TOKEN_SECRET, (err, user) => {
      if (err) {
        // Закрываем соединение, если токен недействителен
        ws.close(1008, 'Invalid token');
        console.log('Connection rejected: invalid token');
        return;
      }

      // Если токен валиден, добавляем информацию о пользователе
      ws.user = user;
      console.log(`User connected: ${user.name}`);

      // Обработчик сообщений от клиента
      ws.on('message', (message) => {
        console.log(`Received: ${message} from user ${user.name}`);
      });

      // Отправка приветственного сообщения
      ws.send('Welcome to the WebSocket server!');
    });
  });

  // Функция для отправки уведомлений всем подключенным клиентам
  function broadcastNewPost(postData) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(postData));
      }
    });
  }

  // Возвращаем broadcast функцию для использования в других частях приложения
  return { broadcastNewPost };
}
