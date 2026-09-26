import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

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
  storageDir: process.env.STORAGE_DIR || path.resolve(process.cwd(), '../../storage/uploads/cards'),
  jwtSecret: process.env.JWT_SECRET || 'gacha-dev-secret-key-32-chars-long!',
};
