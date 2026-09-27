import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../db/pool.js';

export async function listRarities(_req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const [rows] = await pool.query<any[]>(`
      SELECT r.*, COUNT(c.id) AS card_count
      FROM rarities r
      LEFT JOIN cards c ON r.id = c.rarity_id
      GROUP BY r.id
      ORDER BY r.sort_order DESC, r.created_at ASC
    `);
    res.json({ rarities: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list rarities.' });
  }
}

export async function createRarity(req: Request, res: Response): Promise<void> {
  const { name, color, drop_rate, sort_order } = req.body ?? {};
  if (!name || typeof name !== 'string' || !name.trim() || !color) {
    res.status(400).json({ error: 'Name and color are required.' });
    return;
  }

  const pool = getPool();
  const id = `rarity-${uuidv4().slice(0, 8)}`;
  try {
    await pool.query(
      `INSERT INTO rarities (id, name, color, drop_rate, sort_order) VALUES (?, ?, ?, ?, ?)`,
      [id, name.trim(), color, Number(drop_rate) || 0, Number(sort_order) || 0]
    );
    res.status(201).json({ id, name: name.trim(), color, drop_rate: Number(drop_rate) || 0, sort_order: Number(sort_order) || 0 });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create rarity.' });
  }
}

export async function updateRarity(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, color, drop_rate, sort_order } = req.body ?? {};
  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    res.status(400).json({ error: 'Name cannot be empty.' });
    return;
  }
  const pool = getPool();

  try {
    const [result] = await pool.query(
      `UPDATE rarities SET name = ?, color = ?, drop_rate = ?, sort_order = ? WHERE id = ?`,
      [typeof name === 'string' ? name.trim() : name, color, Number(drop_rate) || 0, Number(sort_order) || 0, id]
    );
    if ((result as any).affectedRows === 0) {
      res.status(404).json({ error: 'Rarity not found.' });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update rarity.' });
  }
}

export async function deleteRarity(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const pool = getPool();

  try {
    const [cards] = await pool.query<any[]>('SELECT id FROM cards WHERE rarity_id = ?', [id]);
    if (cards.length > 0) {
      res.status(400).json({ error: 'Cannot delete rarity with assigned cards. Delete or reassign cards first.' });
      return;
    }
    await pool.query('DELETE FROM rarities WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete rarity.' });
  }
}
