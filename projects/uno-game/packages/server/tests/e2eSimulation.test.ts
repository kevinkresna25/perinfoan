import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import express from 'express';
import { setupSocketHandlers } from '../src/sockets/handler.js';
import { RoomManager } from '../src/rooms/RoomManager.js';
import { ClientGameState, Card, canPlayCard } from '@uno/shared';

describe('Multi-Client E2E Headless Gameplay Simulation', () => {
  let server: any;
  let io: Server;
  let port: number;
  let roomManager: RoomManager;
  let p1: ClientSocket;
  let p2: ClientSocket;
  let p3: ClientSocket;

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

  it('simulates 3-player match setup, dealing, and playing a card', async () => {
    p1 = Client(`http://localhost:${port}`);
    p2 = Client(`http://localhost:${port}`);
    p3 = Client(`http://localhost:${port}`);

    // 1. Host creates room
    const roomId = await new Promise<string>((resolve) => {
      p1.emit('room:create', { hostName: 'HostAlice' }, (res: any) => {
        resolve(res.roomId);
      });
    });

    expect(roomId).toHaveLength(6);

    // 2. Player 2 and 3 join
    await new Promise<void>((resolve) => {
      p2.emit('room:join', { roomId, playerName: 'Bob', playerId: 'p2-id' }, () => resolve());
    });
    await new Promise<void>((resolve) => {
      p3.emit('room:join', { roomId, playerName: 'Charlie', playerId: 'p3-id' }, () => resolve());
    });

    // Setup state listeners
    let p1State: ClientGameState | null = null;
    let p2State: ClientGameState | null = null;
    p1.on('game:sync', (s: ClientGameState) => {
      p1State = s;
    });
    p2.on('game:sync', (s: ClientGameState) => {
      p2State = s;
    });

    // 3. Host starts game
    await new Promise<void>((resolve) => {
      p1.emit('game:start', {}, () => resolve());
    });

    // Wait a brief tick for state sync
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(p1State).not.toBeNull();
    expect(p1State!.status).toBe('playing');
    expect(p1State!.players).toHaveLength(3);

    // Verify 7 cards dealt to player 1
    const p1Me = p1State!.players.find((p) => p.isHost);
    expect(p1Me?.hand).toHaveLength(7);

    // Verify State Masking: p1 cannot see p2's hand!
    const p2InP1View = p1State!.players.find((p) => p.name === 'Bob');
    expect(p2InP1View?.hand).toBeUndefined();
    expect(p2InP1View?.cardsCount).toBe(7);

    // 4. Active player plays a playable card or draws
    const activeIdx = p1State!.activePlayerIndex;
    const activePlayer = p1State!.players[activeIdx];
    const topCard = p1State!.topCard;

    if (activePlayer.isHost && p1Me?.hand) {
      // Find an authentic playable card using shared rules, or draw
      const playable = p1Me.hand.find(
        (c: Card) => canPlayCard(c, topCard, p1State!.activeColor)
      );

      const nextSyncPromise = new Promise<ClientGameState>((resolve) => {
        p1.once('game:sync', resolve);
      });

      if (playable) {
        p1.emit('game:play_card', { cardId: playable.id, chosenColor: 'red' });
      } else {
        p1.emit('game:draw_card');
      }

      const updatedState = await nextSyncPromise;
      // Verify turn advanced!
      expect(updatedState.activePlayerIndex).not.toBe(activeIdx);
    }

    p1.disconnect();
    p2.disconnect();
    p3.disconnect();
  });
});
