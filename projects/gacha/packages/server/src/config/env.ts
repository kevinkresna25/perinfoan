import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

function resolveStorageDir(): string {
  if (process.env.STORAGE_DIR) {
    return process.env.STORAGE_DIR;
  }
  // If running from packages/server
  if (path.basename(process.cwd()) === 'server' && fs.existsSync(path.resolve(process.cwd(), '../../storage'))) {
    return path.resolve(process.cwd(), '../../storage/uploads/cards');
  }
  // If running from projects/gacha (root)
  if (fs.existsSync(path.resolve(process.cwd(), 'storage'))) {
    return path.resolve(process.cwd(), 'storage/uploads/cards');
  }
  // Fallback relative to module file location
  const dir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(dir, '../../../../storage/uploads/cards');
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'gacha_user',
    password: process.env.DB_PASSWORD || 'gacha_pass',
    name: process.env.DB_NAME || 'gacha_db',
  },
  adminPassword: process.env.ADMIN_PASSWORD || 'adminsecret',
  storageDir: resolveStorageDir(),
  jwtSecret: process.env.JWT_SECRET || 'gacha-dev-secret-key-32-chars-long!',
};
