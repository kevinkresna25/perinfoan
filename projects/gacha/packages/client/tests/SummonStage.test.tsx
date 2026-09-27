import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { SummonStage } from '../src/components/SummonStage';
import * as api from '../src/services/api';
import * as inventory from '../src/services/inventory';
import type { Card } from '../src/types';

vi.mock('../src/services/api', () => ({
  pullGacha: vi.fn(),
}));

vi.mock('../src/services/inventory', () => ({
  getLocalInventory: vi.fn(),
  recordPulls: vi.fn(),
}));

describe('SummonStage Component', () => {
  const mockOnOpenRates = vi.fn();

  const mockCard1: Card = {
    id: 'card-1',
    name: 'PERINFOAN Dragon',
    rarity: { id: 'r-ssr', name: 'SSR', color: '#FFD700' },
    image_url: '/uploads/cards/dragon.png',
    description: 'Ancient dragon of the stars.',
  };

  const createMockCards = (count: number): Card[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `card-${i + 1}`,
      name: `PERINFOAN Warrior ${i + 1}`,
      rarity: { id: 'r-sr', name: 'SR', color: '#9333EA' },
      image_url: `/uploads/cards/card-${i + 1}.png`,
      description: `Warrior ${i + 1} description`,
    }));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(inventory.getLocalInventory).mockReturnValue({});
  });

  it('renders initial summon pedestal with buttons and drop rates link', () => {
    render(<SummonStage onOpenRates={mockOnOpenRates} />);

    expect(screen.getByText('Summon PERINFOAN Cards')).toBeDefined();
    expect(screen.getByRole('button', { name: /Summon x1$/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Summon x10/i })).toBeDefined();

    const ratesBtn = screen.getByRole('button', { name: /View Drop Rates & Odds/i });
    expect(ratesBtn).toBeDefined();
    fireEvent.click(ratesBtn);
    expect(mockOnOpenRates).toHaveBeenCalledTimes(1);
  });

  it('handles 1x summon flow successfully with newly discovered card', async () => {
    vi.mocked(api.pullGacha).mockResolvedValueOnce({
      results: [mockCard1],
    });

    render(<SummonStage onOpenRates={mockOnOpenRates} />);

    const pull1Btn = screen.getByRole('button', { name: /Summon x1$/i });
    fireEvent.click(pull1Btn);

    await waitFor(() => {
      expect(api.pullGacha).toHaveBeenCalledWith(1);
    });

    expect(inventory.recordPulls).toHaveBeenCalledWith([mockCard1]);

    // Booster pack appears with Brewek Pack button
    await waitFor(() => {
      expect(screen.getByText(/PERINFOAN BOOSTER/i)).toBeDefined();
    });

    // Skip to reveal all to test summary grid
    const skipBtn = screen.getByRole('button', { name: /Skip to Reveal All/i });
    fireEvent.click(skipBtn);

    await waitFor(() => {
      expect(screen.getByText('PERINFOAN Dragon')).toBeDefined();
    });

    // Should have "NEW!" badge since local inventory didn't contain it
    expect(screen.getByText('NEW!')).toBeDefined();
    expect(screen.getByRole('button', { name: /Summon Again/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Replay Pack Reveal/i })).toBeDefined();
  });

  it('does not display NEW! badge if card was already in inventory', async () => {
    vi.mocked(inventory.getLocalInventory).mockReturnValue({
      'card-1': { cardId: 'card-1', count: 2, firstPulledAt: '2026-01-01' },
    });
    vi.mocked(api.pullGacha).mockResolvedValueOnce({
      results: [mockCard1],
    });

    render(<SummonStage onOpenRates={mockOnOpenRates} />);

    const pull1Btn = screen.getByRole('button', { name: /Summon x1$/i });
    fireEvent.click(pull1Btn);

    await waitFor(() => {
      expect(screen.getByText(/PERINFOAN BOOSTER/i)).toBeDefined();
    });

    const skipBtn = screen.getByRole('button', { name: /Skip to Reveal All/i });
    fireEvent.click(skipBtn);

    await waitFor(() => {
      expect(screen.getByText('PERINFOAN Dragon')).toBeDefined();
    });

    expect(screen.queryByText('NEW!')).toBeNull();
  });

  it('handles 10x summon flow rendering grid of cards', async () => {
    const cards10 = createMockCards(10);
    vi.mocked(api.pullGacha).mockResolvedValueOnce({
      results: cards10,
    });

    render(<SummonStage onOpenRates={mockOnOpenRates} />);

    const pull10Btn = screen.getByRole('button', { name: /Summon x10/i });
    fireEvent.click(pull10Btn);

    await waitFor(() => {
      expect(api.pullGacha).toHaveBeenCalledWith(10);
    });

    expect(inventory.recordPulls).toHaveBeenCalledWith(cards10);

    await waitFor(() => {
      expect(screen.getByText(/PERINFOAN BOOSTER/i)).toBeDefined();
    });

    const skipBtn = screen.getByRole('button', { name: /Skip to Reveal All/i });
    fireEvent.click(skipBtn);

    await waitFor(() => {
      expect(screen.getByText('PERINFOAN Warrior 1')).toBeDefined();
      expect(screen.getByText('PERINFOAN Warrior 10')).toBeDefined();
    });
  });

  it('reveals all cards immediately when Reveal All is clicked without needing another tap', async () => {
    const cards = createMockCards(2);
    vi.mocked(api.pullGacha).mockResolvedValueOnce({
      results: cards,
    });

    render(<SummonStage onOpenRates={mockOnOpenRates} />);

    fireEvent.click(screen.getByRole('button', { name: /Summon x10/i }));

    await waitFor(() => {
      expect(screen.getByText(/PERINFOAN BOOSTER/i)).toBeDefined();
    });

    const skipBtn = screen.getByRole('button', { name: /Skip to Reveal All/i });
    fireEvent.click(skipBtn);

    await waitFor(() => {
      expect(screen.getByText('PERINFOAN Warrior 1')).toBeDefined();
      expect(screen.getByText('PERINFOAN Warrior 2')).toBeDefined();
    });

    // Both cards have been flipped and no further Reveal All button is needed
    expect(screen.queryByRole('button', { name: /Reveal All Cards/i })).toBeNull();
  });

  it('resets state when Summon Again is clicked', async () => {
    vi.mocked(api.pullGacha).mockResolvedValueOnce({
      results: [mockCard1],
    });

    render(<SummonStage onOpenRates={mockOnOpenRates} />);

    fireEvent.click(screen.getByRole('button', { name: /Summon x1$/i }));

    await waitFor(() => {
      expect(screen.getByText(/PERINFOAN BOOSTER/i)).toBeDefined();
    });

    const skipBtn = screen.getByRole('button', { name: /Skip to Reveal All/i });
    fireEvent.click(skipBtn);

    await waitFor(() => {
      expect(screen.getByText('PERINFOAN Dragon')).toBeDefined();
    });

    const resetBtn = screen.getByRole('button', { name: /Summon Again/i });
    fireEvent.click(resetBtn);

    expect(screen.queryByText('PERINFOAN Dragon')).toBeNull();
    expect(screen.getByText('Summon PERINFOAN Cards')).toBeDefined();
  });

  it('displays error alert on pull failure', async () => {
    vi.mocked(api.pullGacha).mockRejectedValueOnce(new Error('Network disconnected'));

    render(<SummonStage onOpenRates={mockOnOpenRates} />);

    fireEvent.click(screen.getByRole('button', { name: /Summon x1$/i }));

    await waitFor(() => {
      expect(screen.getByText('Network disconnected')).toBeDefined();
    });

    // Pedestal remains visible
    expect(screen.getByText('Summon PERINFOAN Cards')).toBeDefined();
  });
});
