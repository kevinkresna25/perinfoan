import { Card, CardColor } from '../types/card.js';
import { MasterGameState } from '../types/room.js';
export declare function nextTurnIndex(currentIndex: number, playerCount: number, step: number, direction: 1 | -1): number;
export declare function ensureDrawCards(state: MasterGameState, count: number): {
    cards: Card[];
    newState: MasterGameState;
};
export declare function applyCardPlay(state: MasterGameState, playerId: string, cardId: string, chosenColor?: CardColor): MasterGameState;
export declare function applyDraw(state: MasterGameState, playerId: string): MasterGameState;
//# sourceMappingURL=reducer.d.ts.map