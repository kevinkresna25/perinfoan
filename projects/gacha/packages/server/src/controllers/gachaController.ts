import type { Request, Response } from 'express';
import { getPool } from '../db/pool.js';
import { performPull } from '../services/gachaEngine.js';
import type { RarityWithCards } from '../types/index.js';

export async function getRates(_req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const [rarities] = await pool.query<any[]>(`
      SELECT r.id, r.name, r.color, r.drop_rate, r.sort_order, COUNT(c.id) AS card_count
      FROM rarities r
      LEFT JOIN cards c ON r.id = c.rarity_id
      GROUP BY r.id
      ORDER BY r.sort_order DESC
    `);

    const [cardTotal] = await pool.query<any[]>('SELECT COUNT(*) as total FROM cards');

    res.json({
      rarities,
      total_cards: cardTotal[0]?.total || 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get rates.' });
  }
}

export async function rollGacha(req: Request, res: Response): Promise<void> {
  const { count: rawCount } = req.body ?? {};
  const count = rawCount === 10 ? 10 : 1;
  const pool = getPool();

  let rarityRows: any[];
  let cardRows: any[];
  try {
    [rarityRows] = await pool.query<any[]>('SELECT * FROM rarities ORDER BY sort_order DESC');
    [cardRows] = await pool.query<any[]>('SELECT * FROM cards');
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to query database for gacha roll.' });
    return;
  }

  const poolWithCards: RarityWithCards[] = rarityRows.map((r) => ({
    ...r,
    cards: cardRows.filter((c) => c.rarity_id === r.id),
  }));

  try {
    const results = performPull(count, poolWithCards);
    res.json({ results });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
