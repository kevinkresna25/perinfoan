import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CardModal } from '../src/components/CardModal';
import type { Card, InventoryItem } from '../src/types';

describe('CardModal Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCard: Card = {
    id: 'card-1',
    name: 'Astral Valkyrie',
    rarity: { id: 'r-ssr', name: 'SSR', color: '#FFD700' },
    image_url: '/uploads/cards/valkyrie.png',
    description: 'A radiant warrior of the PERINFOAN dawn.',
  };

  const mockInventoryItem: InventoryItem = {
    cardId: 'card-1',
    count: 4,
    firstPulledAt: '2026-03-15T12:00:00Z',
  };

  it('renders card details and lore correctly', () => {
    render(
      <CardModal
        card={mockCard}
        inventoryItem={mockInventoryItem}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Astral Valkyrie')).toBeDefined();
    expect(screen.getByText('SSR')).toBeDefined();
    expect(screen.getByText('A radiant warrior of the PERINFOAN dawn.')).toBeDefined();

    const img = screen.getByAltText('Astral Valkyrie') as HTMLImageElement;
    expect(img.src).toContain('/uploads/cards/valkyrie.png');

    expect(screen.getByText(/Copies Pulled:/)).toBeDefined();
    expect(screen.getByText('x4')).toBeDefined();
    expect(screen.getByText(/Discovered on/)).toBeDefined();
  });

  it('renders fallback description when description is null or empty', () => {
    const cardWithoutLore: Card = {
      ...mockCard,
      description: null,
    };

    render(
      <CardModal
        card={cardWithoutLore}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('No lore recorded for this PERINFOAN card.')).toBeDefined();
    expect(screen.queryByText(/Copies Pulled:/)).toBeNull();
    expect(screen.queryByText(/Discovered on/)).toBeNull();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <CardModal
        card={mockCard}
        onClose={mockOnClose}
      />
    );

    const closeBtn = screen.getByRole('button');
    fireEvent.click(closeBtn);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking backdrop overlay but not modal card content', () => {
    render(
      <CardModal
        card={mockCard}
        onClose={mockOnClose}
      />
    );

    const backdrop = screen.getByTestId('modal-backdrop');
    // Clicking backdrop itself triggers onClose
    fireEvent.click(backdrop);
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    // Clicking content inside does not trigger onClose
    const title = screen.getByText('Astral Valkyrie');
    fireEvent.click(title);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when pressing Escape key', () => {
    render(
      <CardModal
        card={mockCard}
        onClose={mockOnClose}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
