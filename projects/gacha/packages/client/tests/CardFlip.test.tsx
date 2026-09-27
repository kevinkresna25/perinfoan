import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CardFlip } from '../src/components/CardFlip';
import type { Card } from '../src/types';

describe('CardFlip Component', () => {
  const mockCard: Card = {
    id: 'test-card-1',
    name: 'Mythic Valkyrie',
    rarity: { id: 'r1', name: 'SSR', color: '#FFD700' },
    image_url: '/uploads/cards/valk.png',
    description: 'Bringer of victory.',
  };

  it('renders card with back cover initially', () => {
    render(<CardFlip card={mockCard} />);
    expect(screen.getByText('Tap to Reveal')).toBeDefined();
    expect(screen.getByText('Mythic Valkyrie')).toBeDefined();
    expect(screen.getByText('SSR')).toBeDefined();
    expect(screen.getByText('Bringer of victory.')).toBeDefined();
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('/uploads/cards/valk.png');
    expect(img.getAttribute('alt')).toBe('Mythic Valkyrie');
  });

  it('renders "NEW!" discovery badge when isNew is true', () => {
    const { rerender } = render(<CardFlip card={mockCard} isNew={true} />);
    expect(screen.getByText('NEW!')).toBeDefined();

    rerender(<CardFlip card={mockCard} isNew={false} />);
    expect(screen.queryByText('NEW!')).toBeNull();
  });

  it('calls onReveal callback on click to flip', () => {
    const onReveal = vi.fn();
    render(<CardFlip card={mockCard} onReveal={onReveal} />);

    expect(onReveal).not.toHaveBeenCalled();

    const trigger = screen.getByText('Tap to Reveal');
    fireEvent.click(trigger);

    expect(onReveal).toHaveBeenCalledTimes(1);

    // Clicking again should not trigger onReveal again
    fireEvent.click(trigger);
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it('renders with revealed=true prop already flipped', () => {
    const onReveal = vi.fn();
    render(<CardFlip card={mockCard} revealed={true} onReveal={onReveal} />);

    // Clicking when revealed should not call onReveal
    const trigger = screen.getByText('Tap to Reveal');
    fireEvent.click(trigger);
    expect(onReveal).not.toHaveBeenCalled();
  });

  it('renders rarity badge with the rarity color and dynamic contrast text', () => {
    const { rerender } = render(<CardFlip card={mockCard} />);
    const badge = screen.getByText('SSR');
    expect(badge.style.backgroundColor).toBe('rgb(255, 215, 0)');
    // Gold is bright -> dark text #0f172a (rgb(15, 23, 42))
    expect(badge.style.color).toBe('rgb(15, 23, 42)');

    // Dark rarity color -> white text #f8fafc (rgb(248, 250, 252))
    const darkCard: Card = {
      ...mockCard,
      rarity: { id: 'r2', name: 'Dark', color: '#1E1B4B' },
    };
    rerender(<CardFlip card={darkCard} />);
    const darkBadge = screen.getByText('Dark');
    expect(darkBadge.style.color).toBe('rgb(248, 250, 252)');
  });

  it('supports keyboard accessibility via Enter and Space keys', () => {
    const onReveal = vi.fn();
    render(<CardFlip card={mockCard} onReveal={onReveal} />);

    const cardButton = screen.getByRole('button');
    fireEvent.keyDown(cardButton, { key: 'Enter' });
    expect(onReveal).toHaveBeenCalledTimes(1);

    // Another card with Space key
    const onRevealSpace = vi.fn();
    render(<CardFlip card={{ ...mockCard, id: 'test-2' }} onReveal={onRevealSpace} />);
    const allButtons = screen.getAllByRole('button');
    const secondButton = allButtons[allButtons.length - 1];
    fireEvent.keyDown(secondButton, { key: ' ' });
    expect(onRevealSpace).toHaveBeenCalledTimes(1);
  });

  it('renders correctly when description is null', () => {
    const cardWithoutDesc: Card = {
      ...mockCard,
      description: null,
    };
    render(<CardFlip card={cardWithoutDesc} />);
    expect(screen.queryByText('Bringer of victory.')).toBeNull();
    expect(screen.getByText('Mythic Valkyrie')).toBeDefined();
  });
});
