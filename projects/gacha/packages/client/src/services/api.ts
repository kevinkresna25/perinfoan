import type { Card, Rarity } from '../types';

export async function fetchRates(): Promise<{ rarities: Rarity[]; total_cards: number }> {
  const res = await fetch('/api/gacha/rates');
  if (!res.ok) throw new Error('Failed to load gacha rates');
  return res.json();
}

export async function fetchCards(rarityId?: string): Promise<{ cards: Card[] }> {
  const url = rarityId ? `/api/cards?rarity_id=${encodeURIComponent(rarityId)}` : '/api/cards';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load card catalog');
  return res.json();
}

export async function pullGacha(count: 1 | 10): Promise<{ results: Card[] }> {
  const res = await fetch('/api/gacha/pull', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to pull cards');
  return data;
}

export async function loginAdmin(password: string): Promise<string> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Invalid credentials');
  return data.token;
}

export async function createCardApi(formData: FormData, token: string): Promise<void> {
  const res = await fetch('/api/admin/cards', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to upload card');
  }
}

export async function deleteCardApi(id: string, token: string): Promise<void> {
  const res = await fetch(`/api/admin/cards/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to delete card');
  }
}

export async function saveRarityApi(rarity: Partial<Rarity>, token: string): Promise<void> {
  const isUpdate = Boolean(rarity.id);
  const url = isUpdate ? `/api/admin/rarities/${rarity.id}` : '/api/admin/rarities';
  const method = isUpdate ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(rarity),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to save rarity');
  }
}

export async function deleteRarityApi(id: string, token: string): Promise<void> {
  const res = await fetch(`/api/admin/rarities/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to delete rarity');
  }
}
