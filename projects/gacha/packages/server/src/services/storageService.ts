import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { RequestHandler } from 'express';
import { config } from '../config/env.js';

export function ensureStorageDir(): void {
  if (!fsSync.existsSync(config.storageDir)) {
    fsSync.mkdirSync(config.storageDir, { recursive: true });
  }
}

// Ensure storage directory exists at module initialization
ensureStorageDir();

export const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

export function getSafeExtension(mimetype: string, originalname: string): string {
  if (MIME_EXTENSION_MAP[mimetype]) {
    return MIME_EXTENSION_MAP[mimetype];
  }
  const ext = path.extname(originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.has(ext)) {
    return ext;
  }
  return '.png';
}

export const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureStorageDir();
    cb(null, config.storageDir);
  },
  filename: (_req, file, cb) => {
    const ext = getSafeExtension(file.mimetype, file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

export const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF images are allowed.') as any;
    error.status = 400;
    cb(error);
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter,
});

export const uploadMiddleware: RequestHandler = upload.single('image');

export async function deleteCardImage(filename: string): Promise<boolean> {
  if (!filename || typeof filename !== 'string') {
    return false;
  }
  const sanitizedFilename = path.basename(filename);
  if (!sanitizedFilename || sanitizedFilename === '.' || sanitizedFilename === '..') {
    return false;
  }
  const filePath = path.join(config.storageDir, sanitizedFilename);
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

export function getFallbackCardSvg(cardName: string): string {
  const sanitized = cardName.replace(/[<>&"]/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
    <rect width="400" height="600" fill="#1e1b4b" rx="16"/>
    <rect x="20" y="20" width="360" height="560" fill="none" stroke="#6366f1" stroke-width="4" stroke-dasharray="8" rx="12"/>
    <circle cx="200" cy="240" r="60" fill="#312e81"/>
    <text x="200" y="255" font-family="sans-serif" font-size="48" fill="#a5b4fc" text-anchor="middle">★</text>
    <text x="200" y="360" font-family="sans-serif" font-size="22" font-weight="bold" fill="#e0e7ff" text-anchor="middle">${sanitized}</text>
    <text x="200" y="400" font-family="sans-serif" font-size="14" fill="#818cf8" text-anchor="middle">Card Artwork Preview</text>
  </svg>`;
}
