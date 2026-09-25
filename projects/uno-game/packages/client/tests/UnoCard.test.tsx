import { describe, it, expect } from 'vitest';
import React from 'react';
import { UnoCard } from '../src/components/card/UnoCard';

describe('UnoCard Component', () => {
  it('instantiates UnoCard component definition without throwing', () => {
    expect(UnoCard).toBeDefined();
    const element = React.createElement(UnoCard, {
      card: { id: 'red-7', color: 'red', type: 'number', value: 7 },
      isPlayable: true
    });
    expect(element.props.card.value).toBe(7);
  });
});
