export type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';
export type CardType = 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild_draw4';
export interface Card {
    id: string;
    color: CardColor;
    type: CardType;
    value?: number;
    customImageSlot?: string;
}
//# sourceMappingURL=card.d.ts.map