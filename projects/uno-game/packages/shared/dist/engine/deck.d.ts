import { Card } from '../types/card.js';
export declare function createDeck(): Card[];
export declare function shuffleDeck<T>(items: T[]): T[];
export declare function dealCards(deck: Card[], playerCount: number, cardsPerPlayer: number): {
    hands: Card[][];
    remainingDeck: Card[];
};
//# sourceMappingURL=deck.d.ts.map