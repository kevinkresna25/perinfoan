import { describe, it, expect } from 'vitest';
import { createDeck, shuffleDeck, dealCards } from '../src/engine/deck.js';

describe('UNO Deck Engine', () => {
  it('creates an official 108-card deck with correct color and card type distribution', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(108);

    const colors = ['red', 'blue', 'green', 'yellow'] as const;
    for (const color of colors) {
      const colorCards = deck.filter(c => c.color === color);
      expect(colorCards).toHaveLength(25); // 1 zero, 2x(1-9), 2 skip, 2 reverse, 2 draw2

      const zeros = colorCards.filter(c => c.type === 'number' && c.value === 0);
      expect(zeros).toHaveLength(1);

      for (let v = 1; v <= 9; v++) {
        const numbers = colorCards.filter(c => c.type === 'number' && c.value === v);
        expect(numbers).toHaveLength(2);
      }

      expect(colorCards.filter(c => c.type === 'skip')).toHaveLength(2);
      expect(colorCards.filter(c => c.type === 'reverse')).toHaveLength(2);
      expect(colorCards.filter(c => c.type === 'draw2')).toHaveLength(2);
    }

    const wilds = deck.filter(c => c.color === 'wild');
    expect(wilds).toHaveLength(8);
    expect(wilds.filter(c => c.type === 'wild')).toHaveLength(4);
    expect(wilds.filter(c => c.type === 'wild_draw4')).toHaveLength(4);
  });

  it('deals cards correctly among players and returns remaining deck', () => {
    const deck = createDeck();
    const { hands, remainingDeck } = dealCards(deck, 4, 7);
    expect(hands).toHaveLength(4);
    hands.forEach(hand => expect(hand).toHaveLength(7));
    expect(remainingDeck).toHaveLength(108 - (4 * 7));
  });

  it('shuffles deck maintaining total card count', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    expect(shuffled).toHaveLength(108);
  });
});
