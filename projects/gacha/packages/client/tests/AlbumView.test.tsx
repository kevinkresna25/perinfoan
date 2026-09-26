import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AlbumView } from '../src/components/AlbumView';
import * as api from '../src/services/api';
import * as inventory from '../src/services/inventory';
import type { Card, Rarity } from '../src/types';

vi.mock('../src/services/api', () => ({
  fetchCards: vi.fn(),
  fetchRates: vi.fn(),
}));

vi.mock('../src/services/inventory', () => ({
  getLocalInventory: vi.fn(),
}));

describe('AlbumView Component', () => {
  const mockRarities: Rarity[] = [
    { id: 'r-ssr', name: 'SSR', color: '#FFD700', drop_rate: 10, sort_order: 1 },
    { id: 'r-sr', name: 'SR', color: '#A855F7', drop_rate: 30, sort_order: 2 },
    { id: 'r-r', name: 'R', color: '#3B82F6', drop_rate: 60, sort_order: 3 },
  ];

  const mockCards: Card[] = [
    {
      id: 'card-1',
      name: 'Sun Phoenix',
      rarity: { id: 'r-ssr', name: 'SSR', color: '#FFD700' },
      image_url: '/uploads/cards/phoenix.png',
      description: 'Reborn in golden celestial fire.',
    },
    {
      id: 'card-2',
      name: 'Moon Knight',
      rarity: { id: 'r-sr', name: 'SR', color: '#A855F7' },
      image_url: '/uploads/cards/knight.png',
      description: 'Guardian of nocturnal tides.',
    },
    {
      id: 'card-3',
      name: 'Star Sprite',
      rarity: { id: 'r-r', name: 'R', color: '#3B82F6' },
      image_url: '/uploads/cards/sprite.png',
      description: 'A tiny sparkling companion.',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders progress bar and collection stats', async () => {
    vi.mocked(api.fetchCards).mockResolvedValueOnce({ cards: mockCards });
    vi.mocked(api.fetchRates).mockResolvedValueOnce({ rarities: mockRarities, total_cards: 3 });
    vi.mocked(inventory.getLocalInventory).mockReturnValue({
      'card-1': { cardId: 'card-1', count: 3, firstPulledAt: '2026-01-01' },
      'card-2': { cardId: 'card-2', count: 1, firstPulledAt: '2026-01-02' },
    });

    render(<AlbumView />);

    await waitFor(() => {
      // 2 out of 3 discovered = 67%
      expect(screen.getByText('Collection progress: 2 / 3 cards (67%)')).toBeDefined();
    });

    // Rarity filter tabs
    expect(screen.getByRole('button', { name: 'All (3)' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'SSR' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'SR' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'R' })).toBeDefined();
  });

  it('displays discovered cards with copies and undiscovered cards as silhouettes', async () => {
    vi.mocked(api.fetchCards).mockResolvedValueOnce({ cards: mockCards });
    vi.mocked(api.fetchRates).mockResolvedValueOnce({ rarities: mockRarities, total_cards: 3 });
    vi.mocked(inventory.getLocalInventory).mockReturnValue({
      'card-1': { cardId: 'card-1', count: 5, firstPulledAt: '2026-01-01' },
    });

    render(<AlbumView />);

    await waitFor(() => {
      expect(screen.getByText('Sun Phoenix')).toBeDefined();
    });

    // Card 1 is discovered
    expect(screen.getByText('x5')).toBeDefined();
    expect(screen.getByAltText('Sun Phoenix')).toBeDefined();

    // Cards 2 and 3 are undiscovered, name is not shown, mystery ? is shown
    expect(screen.queryByText('Moon Knight')).toBeNull();
    expect(screen.queryByText('Star Sprite')).toBeNull();
    const mysteryMarks = screen.getAllByText('?');
    expect(mysteryMarks.length).toBe(2);
  });

  it('filters cards when rarity tab is clicked', async () => {
    vi.mocked(api.fetchCards).mockResolvedValueOnce({ cards: mockCards });
    vi.mocked(api.fetchRates).mockResolvedValueOnce({ rarities: mockRarities, total_cards: 3 });
    vi.mocked(inventory.getLocalInventory).mockReturnValue({
      'card-1': { cardId: 'card-1', count: 1, firstPulledAt: '2026-01-01' },
      'card-2': { cardId: 'card-2', count: 1, firstPulledAt: '2026-01-02' },
      'card-3': { cardId: 'card-3', count: 1, firstPulledAt: '2026-01-03' },
    });

    render(<AlbumView />);

    await waitFor(() => {
      expect(screen.getByText('Sun Phoenix')).toBeDefined();
      expect(screen.getByText('Moon Knight')).toBeDefined();
      expect(screen.getByText('Star Sprite')).toBeDefined();
    });

    // Click SSR tab
    fireEvent.click(screen.getByRole('button', { name: 'SSR' }));

    expect(screen.getByText('Sun Phoenix')).toBeDefined();
    expect(screen.queryByText('Moon Knight')).toBeNull();
    expect(screen.queryByText('Star Sprite')).toBeNull();

    // Click SR tab
    fireEvent.click(screen.getByRole('button', { name: 'SR' }));

    expect(screen.queryByText('Sun Phoenix')).toBeNull();
    expect(screen.getByText('Moon Knight')).toBeDefined();
    expect(screen.queryByText('Star Sprite')).toBeNull();

    // Click All tab
    fireEvent.click(screen.getByRole('button', { name: 'All (3)' }));

    expect(screen.getByText('Sun Phoenix')).toBeDefined();
    expect(screen.getByText('Moon Knight')).toBeDefined();
    expect(screen.getByText('Star Sprite')).toBeDefined();
  });

  it('opens CardModal when clicking a discovered card and closes it on demand', async () => {
    vi.mocked(api.fetchCards).mockResolvedValueOnce({ cards: mockCards });
    vi.mocked(api.fetchRates).mockResolvedValueOnce({ rarities: mockRarities, total_cards: 3 });
    vi.mocked(inventory.getLocalInventory).mockReturnValue({
      'card-1': { cardId: 'card-1', count: 2, firstPulledAt: '2026-01-01' },
    });

    render(<AlbumView />);

    await waitFor(() => {
      expect(screen.getByText('Sun Phoenix')).toBeDefined();
    });

    // Click discovered card
    fireEvent.click(screen.getByText('Sun Phoenix'));

    // Modal opens with lore description
    expect(screen.getByText('Reborn in golden celestial fire.')).toBeDefined();

    // Close modal
    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByText('Reborn in golden celestial fire.')).toBeNull();
  });

  it('does not open CardModal when clicking an undiscovered card', async () => {
    vi.mocked(api.fetchCards).mockResolvedValueOnce({ cards: mockCards });
    vi.mocked(api.fetchRates).mockResolvedValueOnce({ rarities: mockRarities, total_cards: 3 });
    vi.mocked(inventory.getLocalInventory).mockReturnValue({});

    render(<AlbumView />);

    await waitFor(() => {
      expect(screen.getAllByText('?').length).toBe(3);
    });

    // Click first undiscovered card container
    fireEvent.click(screen.getAllByText('?')[0]);

    // Modal should not open
    expect(screen.queryByText('Reborn in golden celestial fire.')).toBeNull();
  });
});
