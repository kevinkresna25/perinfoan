import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized. Admin token required.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { role: string };
    if (decoded.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden. Admin role required.' });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}
