import { describe, it, expect, beforeEach } from 'vitest';
import { recordPulls, getLocalInventory, resetLocalInventory } from '../src/services/inventory.js';
import type { Card } from '../src/types.js';

describe('Player Local Inventory Service', () => {
  beforeEach(() => {
    resetLocalInventory();
  });

  const mockCard: Card = {
    id: 'c1',
    name: 'Cosmic Sorceress',
    rarity: { id: 'r1', name: 'SSR', color: '#FFD700' },
    image_url: '/uploads/c1.png',
    description: 'Lore',
  };

  const mockCard2: Card = {
    id: 'c2',
    name: 'Forest Archer',
    rarity: { id: 'r2', name: 'SR', color: '#8B5CF6' },
    image_url: '/uploads/c2.png',
    description: 'Archer lore',
  };

  it('records a new card discovery', () => {
    const { newDiscoveredCount, updated } = recordPulls([mockCard]);
    expect(newDiscoveredCount).toBe(1);
    expect(updated['c1'].count).toBe(1);

    const stored = getLocalInventory();
    expect(stored['c1'].count).toBe(1);
  });

  it('increments duplicate count on repeated pull', () => {
    recordPulls([mockCard]);
    const { newDiscoveredCount, updated } = recordPulls([mockCard]);
    expect(newDiscoveredCount).toBe(0);
    expect(updated['c1'].count).toBe(2);
  });

  it('handles multi-card pulls with mixed new and duplicate cards', () => {
    recordPulls([mockCard]);
    const { newDiscoveredCount, updated } = recordPulls([mockCard, mockCard2, mockCard]);
    expect(newDiscoveredCount).toBe(1);
    expect(updated['c1'].count).toBe(3);
    expect(updated['c2'].count).toBe(1);
  });

  it('returns empty inventory when localStorage has invalid JSON', () => {
    localStorage.setItem('gacha_player_inventory', 'invalid-json{{');
    const inv = getLocalInventory();
    expect(inv).toEqual({});
  });

  it('safely returns empty object without throwing when localStorage contains "null" or non-object values', () => {
    for (const corruptVal of ['null', '123', 'true', '[]', '"string"']) {
      localStorage.setItem('gacha_player_inventory', corruptVal);
      const inv = getLocalInventory();
      expect(inv).toEqual({});
    }
  });

  it('clears inventory on resetLocalInventory', () => {
    recordPulls([mockCard]);
    expect(getLocalInventory()['c1']).toBeDefined();
    resetLocalInventory();
    expect(getLocalInventory()).toEqual({});
  });
});
