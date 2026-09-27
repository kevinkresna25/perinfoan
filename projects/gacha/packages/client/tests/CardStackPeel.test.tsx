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

  it('renders card counter and initial facedown state', () => {
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
    expect(screen.getByRole('button', { name: /tap to reveal card/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /reveal all/i })).toBeDefined();
  });

  it('shows card face-up first upon reveal, then places under peeled cards on Next Card', () => {
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

    // Initial state: Card is facedown, click "Tap to Reveal Card"
    const revealBtn = screen.getByRole('button', { name: /tap to reveal card/i });
    fireEvent.click(revealBtn);

    // Card 1 is now shown face-up
    expect(screen.getByText('Card One')).toBeDefined();

    // Next Card button appears
    const nextBtn = screen.getByRole('button', { name: /next card/i });
    expect(nextBtn).toBeDefined();

    // Click Next Card -> Card 1 placed in peeled cards dock, Card 2 appears on stack
    fireEvent.click(nextBtn);
    expect(screen.getByText(/Card 2 of 2/i)).toBeDefined();
    expect(screen.getByText('Peeled Cards (1)')).toBeDefined();

    // Reveal Card 2
    const revealBtn2 = screen.getByRole('button', { name: /tap to reveal card/i });
    fireEvent.click(revealBtn2);
    expect(screen.getByText('Card Two')).toBeDefined();

    // For the last card, button changes to "View All Cards"
    const viewAllBtn = screen.getByRole('button', { name: /view all cards/i });
    fireEvent.click(viewAllBtn);

    // Completion callback triggered
    expect(handleComplete).toHaveBeenCalledTimes(1);
  });

  it('triggers onSkip when Reveal All is clicked without needing multiple clicks', () => {
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
