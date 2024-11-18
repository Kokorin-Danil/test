import { WebSocketServer } from 'ws';

export function initWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Обработчик для новых подключений
  wss.on('connection', (ws) => {
    console.log('New client connected');

    // Обработчик сообщений от клиента
    ws.on('message', (message) => {
      console.log(`Received: ${message}`);
    });

    // Отправка приветственного сообщения новому клиенту
    ws.send('Welcome to the WebSocket server!');
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
