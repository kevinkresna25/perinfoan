export interface Rarity {
  id: string;
  name: string;
  color: string;
  drop_rate: number;
  sort_order: number;
  card_count?: number;
}

export interface Card {
  id: string;
  name: string;
  rarity: {
    id: string;
    name: string;
    color: string;
  };
  image_url: string;
  description: string | null;
  created_at?: string;
}

export interface InventoryItem {
  cardId: string;
  count: number;
  firstPulledAt: string;
}

export type ViewTab = 'summon' | 'album' | 'admin';
