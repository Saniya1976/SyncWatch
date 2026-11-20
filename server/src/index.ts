import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupSocketIO } from './socket.js';
import { RoomManager } from './classes/RoomManager.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';

app.use(cors({
  origin: CLIENT_ORIGIN === '*' ? true : CLIENT_ORIGIN,
  credentials: true,
}));

app.use(express.json());

// Initialize Socket.IO
const io = setupSocketIO(httpServer, CLIENT_ORIGIN);

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  const roomManager = RoomManager.getInstance();
  res.json({
    status: 'ok',
    activeRooms: roomManager.getActiveRoomCount(),
    timestamp: new Date().toISOString(),
  });
});

// Room verification endpoint
app.get('/api/rooms/:roomCode', (req: Request, res: Response) => {
  const roomCode = req.params.roomCode;
  const roomManager = RoomManager.getInstance();
  const room = roomManager.getRoom(roomCode);

  if (!room) {
    res.status(404).json({ exists: false, error: 'Room not found or expired.' });
    return;
  }

  res.json({
    exists: true,
    roomCode: room.roomCode,
    participantCount: room.participants.size,
    hasVideo: Boolean(room.playbackState.videoId),
  });
});

// Production: Serve static client build
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// Fallback to index.html for SPA routing
app.get('*', (req: Request, res: Response) => {
  // If request is not an API call, serve SPA index.html
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
      if (err) {
        res.status(404).send('YouTube Watch Party - Build client frontend to view the web app.');
      }
    });
  } else {
    res.status(404).json({ error: 'Endpoint not found' });
  }
});

httpServer.listen(PORT, () => {
  console.log(`[Server] YouTube Watch Party server running on port ${PORT}`);
  console.log(`[Server] Socket.IO initialized. In-memory storage active.`);
});

export { app, httpServer, io };

