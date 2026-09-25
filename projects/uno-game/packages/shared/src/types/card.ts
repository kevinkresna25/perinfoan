export type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';

export type CardType =
  | 'number'
  | 'skip'
  | 'reverse'
  | 'draw2'
  | 'wild'
  | 'wild_draw4';

export interface Card {
  id: string;               // e.g. "red-7-a", "wild-draw4-1"
  color: CardColor;
  type: CardType;
  value?: number;           // 0–9 for number cards
  customImageSlot?: string; // Optional custom art mapping key
}
