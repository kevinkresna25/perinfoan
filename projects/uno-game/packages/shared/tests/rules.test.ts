import { describe, it, expect } from 'vitest';
import { canPlayCard } from '../src/engine/rules.js';
import { Card } from '../src/types/card.js';

describe('UNO Rule Validation', () => {
  const red7: Card = { id: 'red-7', color: 'red', type: 'number', value: 7 };
  const blue7: Card = { id: 'blue-7', color: 'blue', type: 'number', value: 7 };
  const redSkip: Card = { id: 'red-skip', color: 'red', type: 'skip' };
  const greenSkip: Card = { id: 'green-skip', color: 'green', type: 'skip' };
  const wild: Card = { id: 'wild-1', color: 'wild', type: 'wild' };
  const yellow3: Card = { id: 'yellow-3', color: 'yellow', type: 'number', value: 3 };

  it('allows same color or same number', () => {
    expect(canPlayCard(blue7, red7, 'red')).toBe(true); // matching value 7
    expect(canPlayCard(redSkip, red7, 'red')).toBe(true); // matching active color red
    expect(canPlayCard(yellow3, red7, 'red')).toBe(false); // different color and value
  });

  it('allows action card on same action card regardless of color', () => {
    expect(canPlayCard(greenSkip, redSkip, 'red')).toBe(true);
  });

  it('always allows wild cards', () => {
    expect(canPlayCard(wild, red7, 'red')).toBe(true);
  });
});
