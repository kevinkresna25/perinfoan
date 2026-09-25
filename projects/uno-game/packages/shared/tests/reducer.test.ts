import { describe, it, expect } from 'vitest';
import { applyCardPlay, applyDraw } from '../src/engine/reducer.js';
import { MasterGameState } from '../src/types/room.js';

describe('Game State Reducer', () => {
  function createTestState(playerCount: number = 3): MasterGameState {
    return {
      roomId: 'TEST01',
      status: 'playing',
      players: Array.from({ length: playerCount }, (_, i) => ({
        id: `p${i}`,
        socketId: `s${i}`,
        name: `Player ${i}`,
        isHost: i === 0,
        cardsCount: 2,
        hand: [
          { id: `red-${i}`, color: 'red', type: 'number', value: i },
          { id: `blue-${i}`, color: 'blue', type: 'number', value: i + 1 }
        ],
        hasCalledUno: false,
        isConnected: true,
        lastActiveAt: Date.now()
      })),
      activePlayerIndex: 0,
      direction: 1,
      topCard: { id: 'red-9', color: 'red', type: 'number', value: 9 },
      activeColor: 'red',
      drawPile: [{ id: 'yellow-1', color: 'yellow', type: 'number', value: 1 }],
      discardPile: [{ id: 'red-9', color: 'red', type: 'number', value: 9 }],
      drawPileCount: 1,
      turnTimeLimit: 30,
      turnRemainingSeconds: 30,
      winnerId: null,
      customImages: {}
    };
  }

  it('advances turn to next player on standard number card play', () => {
    const state = createTestState(3);
    const nextState = applyCardPlay(state, 'p0', 'red-0');
    expect(nextState.activePlayerIndex).toBe(1);
    expect(nextState.topCard.id).toBe('red-0');
  });

  it('acts as skip in 2-player game when reverse is played (Review Focus #2)', () => {
    const state = createTestState(2);
    state.players[0].hand.push({ id: 'red-rev', color: 'red', type: 'reverse' });
    const nextState = applyCardPlay(state, 'p0', 'red-rev');
    // In 2-player game, reverse skips player 1 and returns turn to player 0
    expect(nextState.activePlayerIndex).toBe(0);
  });

  it('reshuffles discard pile when draw pile is empty during multi-card draw (Review Focus #1)', () => {
    const state = createTestState(2);
    state.drawPile = [];
    state.discardPile = [
      { id: 'old-1', color: 'green', type: 'number', value: 1 },
      { id: 'old-2', color: 'green', type: 'number', value: 2 },
      { id: 'top-card', color: 'red', type: 'number', value: 9 } // top card must stay
    ];
    state.topCard = state.discardPile[2];

    const nextState = applyDraw(state, 'p0');
    expect(nextState.players[0].hand).toHaveLength(3);
    expect(nextState.topCard.id).toBe('top-card');
  });

  it('handles skip card in 3-player game', () => {
    const state = createTestState(3);
    state.players[0].hand.push({ id: 'red-skip', color: 'red', type: 'skip' });
    const nextState = applyCardPlay(state, 'p0', 'red-skip');
    expect(nextState.activePlayerIndex).toBe(2);
  });
});
