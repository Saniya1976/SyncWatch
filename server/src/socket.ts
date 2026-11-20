import { Server as HttpServer } from 'node:http';
import { Server, Socket } from 'socket.io';
import { MessageHandler } from './handlers/MessageHandler.js';

export function setupSocketIO(httpServer: HttpServer, allowedOrigin?: string): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigin || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  const messageHandler = new MessageHandler(io);

  io.on('connection', (socket: Socket) => {
    messageHandler.registerEvents(socket);
  });

  return io;
}

