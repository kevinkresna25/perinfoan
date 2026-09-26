export interface Rarity {
  id: string;
  name: string;
  color: string;
  drop_rate: number;
  sort_order: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface Card {
  id: string;
  name: string;
  rarity_id: string;
  image_path: string;
  description: string | null;
  created_at?: Date;
}

export interface RarityWithCards extends Rarity {
  cards: Card[];
}

export interface RollResult {
  id: string;
  name: string;
  rarity: {
    id: string;
    name: string;
    color: string;
  };
  image_url: string;
  description: string | null;
}
