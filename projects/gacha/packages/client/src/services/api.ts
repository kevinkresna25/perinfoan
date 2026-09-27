import type { Card, Rarity } from '../types';

async function parseErrorResponse(res: Response, fallbackMessage: string): Promise<string> {
  if (typeof res.json === 'function') {
    const data = await res.json().catch(() => null);
    if (data && typeof data === 'object' && 'error' in data && data.error) {
      return String(data.error);
    }
  }
  return res.statusText || fallbackMessage;
}

export async function fetchRates(): Promise<{ rarities: Rarity[]; total_cards: number }> {
  const res = await fetch('/api/gacha/rates');
  if (!res.ok) {
    const errorMsg = await parseErrorResponse(res, 'Failed to load gacha rates');
    throw new Error(errorMsg);
  }
  return res.json();
}

export async function fetchCards(rarityId?: string): Promise<{ cards: Card[] }> {
  const url = rarityId ? `/api/cards?rarity_id=${encodeURIComponent(rarityId)}` : '/api/cards';
  const res = await fetch(url);
  if (!res.ok) {
    const errorMsg = await parseErrorResponse(res, 'Failed to load card catalog');
    throw new Error(errorMsg);
  }
  return res.json();
}

export async function pullGacha(count: 1 | 10): Promise<{ results: Card[] }> {
  const res = await fetch('/api/gacha/pull', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count }),
  });
  if (!res.ok) {
    const errorMsg = await parseErrorResponse(res, 'Failed to pull cards');
    throw new Error(errorMsg);
  }
  const data = await res.json().catch(() => ({ error: 'Invalid response from server' }));
  if (data.error && !('results' in data)) {
    throw new Error(data.error);
  }
  return data;
}

export async function loginAdmin(password: string): Promise<string> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const errorMsg = await parseErrorResponse(res, 'Invalid credentials');
    throw new Error(errorMsg);
  }
  const data = await res.json().catch(() => ({ error: 'Invalid response from server' }));
  if (!data.token) {
    throw new Error(data.error || 'Invalid credentials');
  }
  return data.token;
}

export async function createCardApi(formData: FormData, token: string): Promise<void> {
  const res = await fetch('/api/admin/cards', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const errorMsg = await parseErrorResponse(res, 'Failed to upload card');
    throw new Error(errorMsg);
  }
}

export async function deleteCardApi(id: string, token: string): Promise<void> {
  const res = await fetch(`/api/admin/cards/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const errorMsg = await parseErrorResponse(res, 'Failed to delete card');
    throw new Error(errorMsg);
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
    const errorMsg = await parseErrorResponse(res, 'Failed to save rarity');
    throw new Error(errorMsg);
  }
}

export async function deleteRarityApi(id: string, token: string): Promise<void> {
  const res = await fetch(`/api/admin/rarities/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const errorMsg = await parseErrorResponse(res, 'Failed to delete rarity');
    throw new Error(errorMsg);
  }
}
