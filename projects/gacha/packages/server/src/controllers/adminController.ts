import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export function adminLogin(req: Request, res: Response): void {
  const { password } = req.body;
  if (!password || password !== config.adminPassword) {
    res.status(401).json({ error: 'Invalid admin password.' });
    return;
  }

  const token = jwt.sign({ role: 'admin' }, config.jwtSecret, { expiresIn: '24h' });
  res.json({ token, expiresIn: '24h' });
}
