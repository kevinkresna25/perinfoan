import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { RatesModal } from '../src/components/RatesModal';
import * as api from '../src/services/api';
import type { Rarity } from '../src/types';

vi.mock('../src/services/api', () => ({
  fetchRates: vi.fn(),
}));

describe('RatesModal Component', () => {
  const mockOnClose = vi.fn();

  const mockRarities: Rarity[] = [
    { id: 'r-ssr', name: 'SSR', color: '#FFD700', drop_rate: 5, sort_order: 1, card_count: 3 },
    { id: 'r-sr', name: 'SR', color: '#A855F7', drop_rate: 20, sort_order: 2, card_count: 7 },
    { id: 'r-r', name: 'R', color: '#3B82F6', drop_rate: 75, sort_order: 3, card_count: 15 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with fetched rates and total cards', async () => {
    vi.mocked(api.fetchRates).mockResolvedValueOnce({
      rarities: mockRarities,
      total_cards: 25,
    });

    render(<RatesModal onClose={mockOnClose} />);

    expect(screen.getByText('Summon Odds & Details')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Total cards in pool: 25')).toBeDefined();
    });

    expect(screen.getByText('SSR')).toBeDefined();
    expect(screen.getByText('(3 cards)')).toBeDefined();
    expect(screen.getByText('5.00%')).toBeDefined();

    expect(screen.getByText('SR')).toBeDefined();
    expect(screen.getByText('(7 cards)')).toBeDefined();
    expect(screen.getByText('20.00%')).toBeDefined();

    expect(screen.getByText('R')).toBeDefined();
    expect(screen.getByText('(15 cards)')).toBeDefined();
    expect(screen.getByText('75.00%')).toBeDefined();
  });

  it('calls onClose when close button is clicked', async () => {
    vi.mocked(api.fetchRates).mockResolvedValueOnce({
      rarities: mockRarities,
      total_cards: 25,
    });

    render(<RatesModal onClose={mockOnClose} />);

    const closeBtn = screen.getByRole('button');
    fireEvent.click(closeBtn);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('handles fallback 0 card count if card_count is undefined', async () => {
    vi.mocked(api.fetchRates).mockResolvedValueOnce({
      rarities: [
        { id: 'r-ur', name: 'UR', color: '#EF4444', drop_rate: 1, sort_order: 0 },
      ],
      total_cards: 0,
    });

    render(<RatesModal onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('(0 cards)')).toBeDefined();
      expect(screen.getByText('1.00%')).toBeDefined();
    });
  });

  it('calls onClose when clicking backdrop overlay but not modal card content', async () => {
    vi.mocked(api.fetchRates).mockResolvedValueOnce({
      rarities: mockRarities,
      total_cards: 25,
    });

    render(<RatesModal onClose={mockOnClose} />);

    const backdrop = screen.getByTestId('rates-modal-backdrop');
    // Clicking backdrop itself triggers onClose
    fireEvent.click(backdrop);
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    // Clicking content inside does not trigger onClose
    const title = screen.getByText('Summon Odds & Details');
    fireEvent.click(title);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when pressing Escape key', async () => {
    vi.mocked(api.fetchRates).mockResolvedValueOnce({
      rarities: mockRarities,
      total_cards: 25,
    });

    render(<RatesModal onClose={mockOnClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
