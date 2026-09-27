import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../db/pool.js';
import { deleteCardImage } from '../services/storageService.js';

export async function listCards(req: Request, res: Response): Promise<void> {
  try {
    const { rarity_id } = req.query;
    const pool = getPool();

    let query = `
      SELECT c.*, r.name as rarity_name, r.color as rarity_color, r.sort_order as rarity_sort
      FROM cards c
      JOIN rarities r ON c.rarity_id = r.id
    `;
    const params: any[] = [];

    if (rarity_id) {
      query += ' WHERE c.rarity_id = ?';
      params.push(rarity_id);
    }

    query += ' ORDER BY r.sort_order DESC, c.created_at DESC';

    const [cards] = await pool.query<any[]>(query, params);
    res.json({
      cards: cards.map((c) => ({
        id: c.id,
        name: c.name,
        rarity: {
          id: c.rarity_id,
          name: c.rarity_name,
          color: c.rarity_color,
        },
        image_url: `/uploads/cards/${c.image_path}`,
        description: c.description,
        created_at: c.created_at,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list cards.' });
  }
}

export async function createCard(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ error: 'Image file is required.' });
    return;
  }

  const { name, rarity_id, description } = req.body ?? {};
  if (!name || typeof name !== 'string' || !name.trim() || !rarity_id) {
    if (req.file) {
      await deleteCardImage(req.file.filename);
    }
    res.status(400).json({ error: 'Name and rarity_id are required.' });
    return;
  }

  const pool = getPool();
  const id = uuidv4();
  const image_path = req.file.filename;

  try {
    await pool.query(
      `INSERT INTO cards (id, name, rarity_id, image_path, description) VALUES (?, ?, ?, ?, ?)`,
      [id, name.trim(), rarity_id, image_path, description ? description.trim() : null]
    );
    res.status(201).json({
      id,
      name: name.trim(),
      rarity_id,
      image_url: `/uploads/cards/${image_path}`,
      description: description ? description.trim() : description,
    });
  } catch (err: any) {
    await deleteCardImage(image_path);
    res.status(400).json({ error: err.message || 'Failed to create card.' });
  }
}

export async function deleteCard(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const pool = getPool();

  try {
    const [rows] = await pool.query<any[]>('SELECT image_path FROM cards WHERE id = ?', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Card not found.' });
      return;
    }

    await pool.query('DELETE FROM cards WHERE id = ?', [id]);
    await deleteCardImage(rows[0].image_path);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete card.' });
  }
}
