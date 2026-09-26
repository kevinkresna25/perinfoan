import { Card, CardColor, CardType } from '../types/card.js';

export function createDeck(): Card[] {
  const deck: Card[] = [];
  const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];

  colors.forEach(color => {
    deck.push({ id: `${color}-0`, color, type: 'number', value: 0 });
    for (let v = 1; v <= 9; v++) {
      deck.push({ id: `${color}-${v}-a`, color, type: 'number', value: v });
      deck.push({ id: `${color}-${v}-b`, color, type: 'number', value: v });
    }
    const actions: CardType[] = ['skip', 'reverse', 'draw2'];
    actions.forEach(action => {
      deck.push({ id: `${color}-${action}-a`, color, type: action });
      deck.push({ id: `${color}-${action}-b`, color, type: action });
    });
  });

  for (let i = 1; i <= 4; i++) {
    deck.push({ id: `wild-${i}`, color: 'wild', type: 'wild' });
    deck.push({ id: `wild-draw4-${i}`, color: 'wild', type: 'wild_draw4' });
  }

  return deck;
}

export function shuffleDeck<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function dealCards(
  deck: Card[],
  playerCount: number,
  cardsPerPlayer: number
): { hands: Card[][]; remainingDeck: Card[] } {
  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  const remainingDeck = [...deck];

  for (let i = 0; i < cardsPerPlayer; i++) {
    for (let p = 0; p < playerCount; p++) {
      const card = remainingDeck.shift();
      if (card) hands[p].push(card);
    }
  }

  return { hands, remainingDeck };
}
