import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchRates,
  fetchCards,
  pullGacha,
  loginAdmin,
  createCardApi,
  deleteCardApi,
  saveRarityApi,
  deleteRarityApi,
} from '../src/services/api.js';

describe('Client API Service', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetchRates returns rates data on success', async () => {
    const mockData = { rarities: [{ id: 'r1', name: 'SSR', color: '#FFD700', drop_rate: 10, sort_order: 1 }], total_cards: 5 };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as any);

    const res = await fetchRates();
    expect(res).toEqual(mockData);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/gacha/rates');
  });

  it('fetchRates throws error when response is not ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
    } as any);

    await expect(fetchRates()).rejects.toThrow('Failed to load gacha rates');
  });

  it('fetchCards handles optional rarityId query parameter', async () => {
    const mockData = { cards: [] };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as any);

    await fetchCards('rarity-ssr');
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/cards?rarity_id=rarity-ssr');

    await fetchCards();
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/cards');
  });

  it('fetchCards throws error when response is not ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
    } as any);

    await expect(fetchCards()).rejects.toThrow('Failed to load card catalog');
  });

  it('pullGacha sends POST request with count', async () => {
    const mockRes = { results: [] };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRes,
    } as any);

    const data = await pullGacha(10);
    expect(data).toEqual(mockRes);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/gacha/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: 10 }),
    });
  });

  it('pullGacha throws server error message if request fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Gacha pool is empty.' }),
    } as any);

    await expect(pullGacha(1)).rejects.toThrow('Gacha pool is empty.');
  });

  it('pullGacha handles non-JSON error response gracefully using statusText', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Bad Gateway',
      json: async () => {
        throw new Error('Not JSON');
      },
    } as any);

    await expect(pullGacha(1)).rejects.toThrow('Bad Gateway');
  });

  it('createCardApi handles non-JSON error response gracefully', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Payload Too Large',
      json: async () => {
        throw new Error('Not JSON');
      },
    } as any);

    await expect(createCardApi(new FormData(), 'token')).rejects.toThrow('Payload Too Large');
  });

  it('loginAdmin sends password and returns token', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'mock-jwt-token' }),
    } as any);

    const token = await loginAdmin('secret123');
    expect(token).toBe('mock-jwt-token');
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'secret123' }),
    });
  });

  it('loginAdmin throws error on invalid credentials', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Invalid admin password.' }),
    } as any);

    await expect(loginAdmin('wrong')).rejects.toThrow('Invalid admin password.');
  });

  it('createCardApi posts FormData with bearer authorization', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as any);

    const formData = new FormData();
    await createCardApi(formData, 'auth-token');
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/admin/cards', {
      method: 'POST',
      headers: { Authorization: 'Bearer auth-token' },
      body: formData,
    });
  });

  it('deleteCardApi sends DELETE request with authorization', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as any);

    await deleteCardApi('card-1', 'auth-token');
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/admin/cards/card-1', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer auth-token' },
    });
  });

  it('saveRarityApi creates new rarity when no id provided', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'new-r' }),
    } as any);

    await saveRarityApi({ name: 'UR', color: '#FF0000', drop_rate: 1, sort_order: 3 }, 'auth-token');
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/admin/rarities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer auth-token',
      },
      body: JSON.stringify({ name: 'UR', color: '#FF0000', drop_rate: 1, sort_order: 3 }),
    });
  });

  it('saveRarityApi updates existing rarity when id provided', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as any);

    await saveRarityApi({ id: 'r1', name: 'UR+', color: '#FF0000', drop_rate: 2, sort_order: 4 }, 'auth-token');
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/admin/rarities/r1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer auth-token',
      },
      body: JSON.stringify({ id: 'r1', name: 'UR+', color: '#FF0000', drop_rate: 2, sort_order: 4 }),
    });
  });

  it('deleteRarityApi sends DELETE request with authorization', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as any);

    await deleteRarityApi('r1', 'auth-token');
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/admin/rarities/r1', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer auth-token' },
    });
  });
});
