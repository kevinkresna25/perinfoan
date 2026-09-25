import { describe, it, expect } from 'vitest';
import { maskStateForPlayer } from '../src/utils/stateMask.js';
import { MasterGameState } from '@uno/shared';

describe('Authoritative State Masking', () => {
  it('masks other players cards and strips draw pile completely', () => {
    const masterState: MasterGameState = {
      roomId: 'MASK01',
      status: 'playing',
      players: [
        {
          id: 'player-1',
          socketId: 's1',
          name: 'Alice',
          isHost: true,
          cardsCount: 2,
          hand: [{ id: 'red-1', color: 'red', type: 'number', value: 1 }],
          hasCalledUno: false,
          isConnected: true,
          lastActiveAt: Date.now()
        },
        {
          id: 'player-2',
          socketId: 's2',
          name: 'Bob',
          isHost: false,
          cardsCount: 2,
          hand: [{ id: 'blue-5', color: 'blue', type: 'number', value: 5 }],
          hasCalledUno: false,
          isConnected: true,
          lastActiveAt: Date.now()
        }
      ],
      activePlayerIndex: 0,
      direction: 1,
      topCard: { id: 'red-9', color: 'red', type: 'number', value: 9 },
      activeColor: 'red',
      drawPile: [{ id: 'yellow-2', color: 'yellow', type: 'number', value: 2 }],
      discardPile: [],
      drawPileCount: 1,
      turnTimeLimit: 30,
      turnRemainingSeconds: 30,
      winnerId: null,
      customImages: {}
    };

    const clientState = maskStateForPlayer(masterState, 'player-1');

    // 1. Draw pile array must not exist on client state
    expect((clientState as any).drawPile).toBeUndefined();
    expect(clientState.drawPileCount).toBe(1);

    // 2. Player 1 sees own hand
    expect(clientState.players[0].hand).toBeDefined();
    expect(clientState.players[0].hand![0].id).toBe('red-1');

    // 3. Player 1 CANNOT see Bob's hand (must be undefined)
    expect(clientState.players[1].hand).toBeUndefined();
    expect(clientState.players[1].cardsCount).toBe(1);
  });
});
