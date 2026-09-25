import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RoomManager } from '../src/rooms/RoomManager.js';

describe('Room Manager & Game Room Lifecycle', () => {
  let manager: RoomManager;

  beforeEach(() => {
    manager = new RoomManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  it('generates 6-character room codes and registers new room', () => {
    const room = manager.createRoom('HostPlayer', 30, 'p1', 's1');
    expect(room.id).toHaveLength(6);
    expect(room.players).toHaveLength(1);
    expect(room.players[0].isHost).toBe(true);
    expect(manager.getRoom(room.id)).toBe(room);
  });

  it('enforces UNO penalty when player fails to call UNO (Review Focus #4)', () => {
    const room = manager.createRoom('HostPlayer', 30, 'host-id', 's1');
    room.addPlayer('Player2', 'p2-id', 's2');
    room.start();

    // Manually set player 2 to 1 card and hasCalledUno = false
    room.state.players[1].hand = [{ id: 'red-1', color: 'red', type: 'number', value: 1 }];
    room.state.players[1].cardsCount = 1;
    room.state.players[1].hasCalledUno = false;

    // Host catches Player 2
    const penaltyApplied = room.catchUno(room.players[0].id, 'p2-id');
    expect(penaltyApplied).toBe(true);
    expect(room.state.players[1].hand.length).toBe(3); // 1 original + 2 penalty
  });

  it('handles player reconnection within existing room (Review Focus #5)', () => {
    const room = manager.createRoom('HostPlayer', 30, 'host-id', 's1');
    room.addPlayer('Player2', 'p2-id', 's2');

    // Simulate disconnect then reconnect with new socket
    const reconnected = room.addPlayer('Player2', 'p2-id', 's2-new');
    expect(reconnected.socketId).toBe('s2-new');
    expect(room.players).toHaveLength(2); // didn't add duplicate player
  });

  it('allows calling UNO with 2 cards only on active turn, or with 1 card at any time', () => {
    const room = manager.createRoom('HostPlayer', 30, 'host-id', 's1');
    room.addPlayer('Player2', 'p2-id', 's2');
    room.start();

    // Turn is activePlayerIndex = 0 (host-id)
    room.state.activePlayerIndex = 0;
    room.state.players[0].hand = [
      { id: 'red-1', color: 'red', type: 'number', value: 1 },
      { id: 'blue-2', color: 'blue', type: 'number', value: 2 },
    ];
    room.state.players[1].hand = [
      { id: 'red-3', color: 'red', type: 'number', value: 3 },
      { id: 'blue-4', color: 'blue', type: 'number', value: 4 },
    ];

    // Host has 2 cards and it IS their turn -> can call UNO
    expect(room.callUno('host-id')).toBe(true);

    // Player 2 has 2 cards but it is NOT their turn -> CANNOT call UNO
    expect(room.callUno('p2-id')).toBe(false);

    // If Player 2 is down to 1 card, they CAN call UNO even when not their turn
    room.state.players[1].hand = [{ id: 'red-3', color: 'red', type: 'number', value: 3 }];
    expect(room.callUno('p2-id')).toBe(true);
  });
});
