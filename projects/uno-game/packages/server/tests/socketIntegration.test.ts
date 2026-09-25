import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import express from 'express';
import { setupSocketHandlers } from '../src/sockets/handler.js';
import { RoomManager } from '../src/rooms/RoomManager.js';

describe('Socket.io Multiplayer Integration', () => {
  let server: any;
  let io: Server;
  let port: number;
  let client1: ClientSocket;
  let client2: ClientSocket;
  let roomManager: RoomManager;

  beforeAll(async () => {
    const app = express();
    server = createServer(app);
    io = new Server(server, { cors: { origin: '*' } });
    roomManager = new RoomManager();
    setupSocketHandlers(io, roomManager);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        port = (server.address() as any).port;
        resolve();
      });
    });
  });

  afterAll(() => {
    roomManager.destroy();
    io.close();
    server.close();
  });

  it('handles room creation and player join with state sync (Review Focus #5)', async () => {
    client1 = Client(`http://localhost:${port}`);
    client2 = Client(`http://localhost:${port}`);

    const roomCode = await new Promise<string>((resolve) => {
      client1.emit('room:create', { hostName: 'Alice' }, (res: any) => {
        resolve(res.roomId);
      });
    });

    expect(roomCode).toHaveLength(6);

    const joinSuccess = await new Promise<boolean>((resolve) => {
      client2.emit('room:join', { roomId: roomCode, playerName: 'Bob', playerId: 'bob-uuid' }, (res: any) => {
        resolve(res.success);
      });
    });

    expect(joinSuccess).toBe(true);

    client1.disconnect();
    client2.disconnect();
  });
});
