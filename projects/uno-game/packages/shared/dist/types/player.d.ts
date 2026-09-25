import { Card } from './card.js';
export interface Player {
    id: string;
    socketId: string;
    name: string;
    isHost: boolean;
    cardsCount: number;
    hand?: Card[];
    hasCalledUno: boolean;
    isConnected: boolean;
    lastActiveAt: number;
}
//# sourceMappingURL=player.d.ts.map