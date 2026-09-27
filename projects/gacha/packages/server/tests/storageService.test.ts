import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs/promises';
import {
  deleteCardImage,
  getFallbackCardSvg,
  upload,
  uploadMiddleware,
  fileFilter,
  getSafeExtension,
  MIME_EXTENSION_MAP,
} from '../src/services/storageService.js';
import { config } from '../src/config/env.js';

vi.mock('fs/promises');

describe('Storage Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('deleteCardImage', () => {
    it('deletes card image file when file exists', async () => {
      vi.mocked(fs.unlink).mockResolvedValue(undefined);
      const result = await deleteCardImage('test-card.png');
      expect(result).toBe(true);
      expect(fs.unlink).toHaveBeenCalledWith(expect.stringContaining('test-card.png'));
    });

    it('handles missing file gracefully without throwing error', async () => {
      vi.mocked(fs.unlink).mockRejectedValue(new Error('ENOENT: no such file'));
      const result = await deleteCardImage('missing.png');
      expect(result).toBe(false);
    });

    it('sanitizes filename to prevent directory traversal', async () => {
      vi.mocked(fs.unlink).mockResolvedValue(undefined);
      await deleteCardImage('../../../etc/passwd');
      expect(fs.unlink).toHaveBeenCalledWith(expect.stringMatching(/[\\/]cards[\\/]passwd$/));
      expect(fs.unlink).not.toHaveBeenCalledWith(expect.stringContaining('..'));
    });

    it('returns false immediately on empty or relative root filenames', async () => {
      expect(await deleteCardImage('')).toBe(false);
      expect(await deleteCardImage('.')).toBe(false);
      expect(await deleteCardImage('..')).toBe(false);
      expect(await deleteCardImage('/' as any)).toBe(false);
      expect(fs.unlink).not.toHaveBeenCalled();
    });
  });

  describe('getFallbackCardSvg', () => {
    it('generates an SVG card placeholder with the card name', () => {
      const svg = getFallbackCardSvg('Solar Paladin');
      expect(svg).toContain('<svg');
      expect(svg).toContain('Solar Paladin');
      expect(svg).toContain('Card Artwork Preview');
    });

    it('sanitizes XML/HTML special characters in card name', () => {
      const svg = getFallbackCardSvg('<script>alert("xss")</script>&');
      expect(svg).not.toContain('<script>');
      expect(svg).not.toContain('alert("xss")');
      expect(svg).not.toContain('&');
      expect(svg).toContain('scriptalert(xss)/script');
    });
  });

  describe('upload multer configuration', () => {
    it('exports upload instance and uploadMiddleware', () => {
      expect(upload).toBeDefined();
      expect(typeof upload.single).toBe('function');
      expect(uploadMiddleware).toBeDefined();
    });

    it('accepts valid image MIME types (jpeg, png, webp, gif)', () => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      for (const mimetype of allowed) {
        const cb = vi.fn();
        fileFilter({} as any, { mimetype } as any, cb);
        expect(cb).toHaveBeenCalledWith(null, true);
      }
    });

    it('rejects disallowed MIME types with an error', () => {
      const disallowed = ['application/pdf', 'text/plain', 'image/svg+xml', 'video/mp4'];
      for (const mimetype of disallowed) {
        const cb = vi.fn();
        fileFilter({} as any, { mimetype } as any, cb);
        expect(cb).toHaveBeenCalledWith(expect.any(Error));
        const callArg = cb.mock.calls[0][0];
        expect((callArg as Error).message).toContain('Invalid file type');
      }
    });

    it('maps verified MIME types directly to safe extensions', () => {
      expect(getSafeExtension('image/jpeg', 'photo.jpeg')).toBe('.jpg');
      expect(getSafeExtension('image/png', 'image.png')).toBe('.png');
      expect(getSafeExtension('image/webp', 'art.webp')).toBe('.webp');
      expect(getSafeExtension('image/gif', 'anim.gif')).toBe('.gif');
    });

    it('prevents arbitrary client extensions from overriding verified MIME type', () => {
      expect(getSafeExtension('image/png', 'malicious.php')).toBe('.png');
      expect(getSafeExtension('image/jpeg', 'exploit.sh')).toBe('.jpg');
    });

    it('falls back safely when MIME type is unmapped', () => {
      expect(getSafeExtension('application/octet-stream', 'custom.webp')).toBe('.webp');
      expect(getSafeExtension('application/octet-stream', 'dangerous.exe')).toBe('.png');
    });
  });
});
