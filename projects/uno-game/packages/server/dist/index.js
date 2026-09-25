import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { RoomManager } from './rooms/RoomManager.js';
import { setupSocketHandlers } from './sockets/handler.js';
import { createUploadRouter } from './routes/uploads.js';
const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;
const CLIENT_DIST_PATH = path.resolve(process.cwd(), 'packages/client/dist');
const UPLOADS_PATH = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(UPLOADS_PATH, { recursive: true });
app.use(cors());
app.use(express.json());
const roomManager = new RoomManager();
// Mount image uploads router
app.use('/api', createUploadRouter(roomManager));
app.use('/uploads', express.static(UPLOADS_PATH));
// Serve static frontend assets if available
if (fs.existsSync(CLIENT_DIST_PATH)) {
    app.use(express.static(CLIENT_DIST_PATH));
    app.get('*', (_req, res) => {
        res.sendFile(path.join(CLIENT_DIST_PATH, 'index.html'));
    });
}
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
setupSocketHandlers(io, roomManager);
server.listen(PORT, () => {
    console.log(`🎮 Perinfoan UNO Game server listening on http://localhost:${PORT}`);
});
export { app, server, io, roomManager };
//# sourceMappingURL=index.js.map