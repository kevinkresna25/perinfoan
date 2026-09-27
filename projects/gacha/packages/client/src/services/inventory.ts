import type { InventoryItem, Card } from '../types';

const STORAGE_KEY = 'gacha_player_inventory';

export function getLocalInventory(): Record<string, InventoryItem> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
  } catch {
    return {};
  }
}

export function recordPulls(cards: Card[]): { newDiscoveredCount: number; updated: Record<string, InventoryItem> } {
  const inventory = getLocalInventory();
  let newDiscoveredCount = 0;

  for (const card of cards) {
    if (!inventory[card.id]) {
      inventory[card.id] = {
        cardId: card.id,
        count: 1,
        firstPulledAt: new Date().toISOString(),
      };
      newDiscoveredCount++;
    } else {
      inventory[card.id].count += 1;
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
  } catch (err) {
    console.warn('Failed to save to localStorage:', err);
  }

  return { newDiscoveredCount, updated: inventory };
}

export function resetLocalInventory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage clear errors
  }
}
