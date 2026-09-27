import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CardStackPeel } from '../src/components/CardStackPeel';
import type { Card } from '../src/types';

describe('CardStackPeel Component', () => {
  const mockCards: Card[] = [
    {
      id: 'card-1',
      name: 'Card One',
      rarity: { id: 'r-sr', name: 'SR', color: '#a855f7' },
      image_url: '/uploads/c1.png',
      description: 'First card',
    },
    {
      id: 'card-2',
      name: 'Card Two',
      rarity: { id: 'r-ssr', name: 'SSR', color: '#ffd700' },
      image_url: '/uploads/c2.png',
      description: 'Second card',
    },
  ];

  it('renders card counter and current stack state', () => {
    const handleComplete = vi.fn();
    const handleSkip = vi.fn();

    render(
      <CardStackPeel
        cards={mockCards}
        newCardIds={new Set(['card-2'])}
        onComplete={handleComplete}
        onSkip={handleSkip}
      />
    );

    expect(screen.getByText(/Card 1 of 2/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /peel card/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /reveal all/i })).toBeDefined();
  });

  it('peels cards sequentially and triggers onComplete on last card', () => {
    const handleComplete = vi.fn();
    const handleSkip = vi.fn();

    render(
      <CardStackPeel
        cards={mockCards}
        newCardIds={new Set()}
        onComplete={handleComplete}
        onSkip={handleSkip}
      />
    );

    const peelBtn = screen.getByRole('button', { name: /peel card/i });

    // Peel card 1
    fireEvent.click(peelBtn);
    expect(screen.getByText('Card One')).toBeDefined();
    expect(screen.getByText(/Card 2 of 2/i)).toBeDefined();

    // Peel card 2 (last card)
    fireEvent.click(peelBtn);
    expect(screen.getByText('Card Two')).toBeDefined();

    // After finishing last card, "Finish" or onComplete is triggered
    const finishBtn = screen.getByRole('button', { name: /view summary/i });
    fireEvent.click(finishBtn);
    expect(handleComplete).toHaveBeenCalledTimes(1);
  });

  it('triggers onSkip when Reveal All is clicked', () => {
    const handleComplete = vi.fn();
    const handleSkip = vi.fn();

    render(
      <CardStackPeel
        cards={mockCards}
        newCardIds={new Set()}
        onComplete={handleComplete}
        onSkip={handleSkip}
      />
    );

    const skipBtn = screen.getByRole('button', { name: /reveal all/i });
    fireEvent.click(skipBtn);
    expect(handleSkip).toHaveBeenCalledTimes(1);
  });
});
