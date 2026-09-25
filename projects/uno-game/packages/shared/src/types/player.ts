import { Card } from './card.js';

export interface Player {
  id: string;               // Session ID (persisted in client sessionStorage)
  socketId: string;
  name: string;
  isHost: boolean;
  cardsCount: number;
  hand?: Card[];            // Populated ONLY for client's own hand (masked for others)
  hasCalledUno: boolean;
  isConnected: boolean;
  lastActiveAt: number;
}
