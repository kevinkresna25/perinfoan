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

  it('renders rarity badge with the rarity color', () => {
    render(<CardFlip card={mockCard} />);
    const badge = screen.getByText('SSR');
    expect(badge.style.backgroundColor).toBe('rgb(255, 215, 0)');
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
