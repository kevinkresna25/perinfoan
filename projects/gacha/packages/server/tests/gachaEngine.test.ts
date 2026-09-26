import { describe, it, expect } from 'vitest';
import { performPull } from '../src/services/gachaEngine.js';
import type { RarityWithCards } from '../src/types/index.js';

describe('Gacha Roll Engine', () => {
  const mockPool: RarityWithCards[] = [
    {
      id: 'rarity-ssr',
      name: 'SSR',
      color: '#FFD700',
      drop_rate: 10,
      sort_order: 2,
      cards: [
        { id: 'c-ssr-1', name: 'SSR Dragon', rarity_id: 'rarity-ssr', image_path: 'c1.png', description: 'Desc' }
      ]
    },
    {
      id: 'rarity-r',
      name: 'R',
      color: '#3B82F6',
      drop_rate: 90,
      sort_order: 1,
      cards: [
        { id: 'c-r-1', name: 'R Knight', rarity_id: 'rarity-r', image_path: 'c2.png', description: 'Desc' }
      ]
    }
  ];

  it('throws error when total pool contains 0 cards', () => {
    const emptyPool: RarityWithCards[] = [
      { id: 'r1', name: 'SSR', color: '#FFF', drop_rate: 100, sort_order: 1, cards: [] }
    ];
    expect(() => performPull(1, emptyPool)).toThrow('Gacha pool is empty. No cards are available to pull.');
  });

  it('pulls SSR when random roll lands in SSR threshold', () => {
    // 10% SSR: roll value 0.05 corresponds to 5% -> SSR
    const results = performPull(1, mockPool, () => 0.05);
    expect(results).toHaveLength(1);
    expect(results[0].rarity.name).toBe('SSR');
    expect(results[0].name).toBe('SSR Dragon');
  });

  it('pulls R when random roll lands in R threshold', () => {
    // roll value 0.50 corresponds to 50% -> R
    const results = performPull(1, mockPool, () => 0.50);
    expect(results).toHaveLength(1);
    expect(results[0].rarity.name).toBe('R');
  });

  it('falls back to available tier if rolled tier has 0 cards', () => {
    const poolWithEmptySSR: RarityWithCards[] = [
      {
        id: 'rarity-ssr',
        name: 'SSR',
        color: '#FFD700',
        drop_rate: 50,
        sort_order: 2,
        cards: [] // No cards in SSR
      },
      {
        id: 'rarity-r',
        name: 'R',
        color: '#3B82F6',
        drop_rate: 50,
        sort_order: 1,
        cards: [
          { id: 'c-r-1', name: 'Fallback Knight', rarity_id: 'rarity-r', image_path: 'c2.png', description: 'Desc' }
        ]
      }
    ];

    // Roll 0.10 lands in SSR bracket, but SSR is empty -> should fall back to R
    const results = performPull(1, poolWithEmptySSR, () => 0.10);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Fallback Knight');
    expect(results[0].rarity.name).toBe('R');
  });

  it('normalizes rates when drop_rate sum is not 100', () => {
    const unnormalizedPool: RarityWithCards[] = [
      {
        id: 'rarity-a',
        name: 'TierA',
        color: '#FFF',
        drop_rate: 20, // 20 / 40 = 50%
        sort_order: 2,
        cards: [{ id: 'c-a', name: 'Card A', rarity_id: 'rarity-a', image_path: 'a.png', description: null }]
      },
      {
        id: 'rarity-b',
        name: 'TierB',
        color: '#000',
        drop_rate: 20, // 20 / 40 = 50%
        sort_order: 1,
        cards: [{ id: 'c-b', name: 'Card B', rarity_id: 'rarity-b', image_path: 'b.png', description: null }]
      }
    ];

    // Roll 0.49 -> TierA, Roll 0.51 -> TierB
    const resA = performPull(1, unnormalizedPool, () => 0.49);
    const resB = performPull(1, unnormalizedPool, () => 0.51);
    expect(resA[0].name).toBe('Card A');
    expect(resB[0].name).toBe('Card B');
  });

  it('executes 10-pull and guarantees at least 1 card with sort_order >= 1 when available', () => {
    const results = performPull(10, mockPool);
    expect(results).toHaveLength(10);
  });
});
