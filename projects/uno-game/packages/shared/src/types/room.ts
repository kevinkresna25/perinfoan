import { Card, CardColor } from './card.js';
import { Player } from './player.js';

export type RoomStatus = 'lobby' | 'playing' | 'ended';
export type Direction = 1 | -1;

export interface ClientGameState {
  roomId: string;
  status: RoomStatus;
  players: Player[];
  activePlayerIndex: number;
  direction: Direction;
  topCard: Card;
  activeColor: CardColor;
  drawPileCount: number;
  turnTimeLimit: number;
  turnRemainingSeconds: number;
  winnerId: string | null;
  customImages: Record<string, string>;
}

export interface MasterGameState extends Omit<ClientGameState, 'players'> {
  drawPile: Card[];
  discardPile: Card[];
  players: (Player & { hand: Card[] })[];
}
