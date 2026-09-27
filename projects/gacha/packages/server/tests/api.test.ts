import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import superagent from 'superagent';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { createApp } from '../src/app.js';
import * as poolModule from '../src/db/pool.js';
import * as storageService from '../src/services/storageService.js';
import { config } from '../src/config/env.js';

// Ensure superagent populates res.text for image/svg responses in tests
const originalImageParser = (superagent as any).parse.image;
(superagent as any).parse.image = (res: any, fn: any) => {
  originalImageParser(res, (err: any, buf: any) => {
    if (!err && buf) {
      res.text = buf.toString('utf8');
    }
    fn(err, buf);
  });
};

vi.mock('../src/db/pool.js');

describe('API Integration Endpoints', () => {
  let app: any;
  let adminToken: string;
  let nonAdminToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
    adminToken = jwt.sign({ role: 'admin' }, config.jwtSecret, { expiresIn: '1h' });
    nonAdminToken = jwt.sign({ role: 'user' }, config.jwtSecret, { expiresIn: '1h' });
  });

  describe('Admin Auth & Middleware', () => {
    it('rejects admin routes without auth token', async () => {
      const res = await request(app).post('/api/admin/rarities').send({ name: 'Test' });
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('rejects GET /api/admin/rarities without auth token', async () => {
      const res = await request(app).get('/api/admin/rarities');
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('rejects admin routes with malformed auth header', async () => {
      const res = await request(app)
        .post('/api/admin/rarities')
        .set('Authorization', 'Basic 12345')
        .send({ name: 'Test' });
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('rejects admin routes with invalid or expired token', async () => {
      const res = await request(app)
        .post('/api/admin/rarities')
        .set('Authorization', 'Bearer invalid-token')
        .send({ name: 'Test' });
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid or expired token');
    });

    it('rejects admin routes with non-admin token role', async () => {
      const res = await request(app)
        .post('/api/admin/rarities')
        .set('Authorization', `Bearer ${nonAdminToken}`)
        .send({ name: 'Test' });
      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Forbidden');
    });

    it('fails admin login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ password: 'wrongpassword' });
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid admin password');
    });

    it('authenticates admin with valid password and returns token', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ password: config.adminPassword });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.expiresIn).toBe('24h');
      const decoded = jwt.verify(res.body.token, config.jwtSecret) as any;
      expect(decoded.role).toBe('admin');
    });

    it('handles admin login with missing body safely', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send();
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid admin password');
    });
  });

  describe('Gacha Endpoints', () => {
    it('returns rates and card counts from /api/gacha/rates', async () => {
      const mockPool = {
        query: vi.fn()
          .mockResolvedValueOnce([[{ id: 'ssr', name: 'SSR', drop_rate: 5, card_count: 2 }], []])
          .mockResolvedValueOnce([[{ total: 2 }], []]),
      };
      vi.mocked(poolModule.getPool).mockReturnValue(mockPool as any);

      const res = await request(app).get('/api/gacha/rates');
      expect(res.status).toBe(200);
      expect(res.body.rarities).toHaveLength(1);
      expect(res.body.rarities[0].id).toBe('ssr');
      expect(res.body.total_cards).toBe(2);
    });

    it('rolls single pull on /api/gacha/pull', async () => {
      const mockPool = {
        query: vi.fn()
          .mockResolvedValueOnce([[
            { id: 'ssr', name: 'SSR', color: '#ff0000', drop_rate: 100, sort_order: 3 },
          ], []])
          .mockResolvedValueOnce([[
            { id: 'c1', name: 'Legend Dragon', rarity_id: 'ssr', image_path: 'dragon.png', description: 'Fire dragon' },
          ], []]),
      };
      vi.mocked(poolModule.getPool).mockReturnValue(mockPool as any);

      const res = await request(app)
        .post('/api/gacha/pull')
        .send({ count: 1 });
      expect(res.status).toBe(200);
      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].name).toBe('Legend Dragon');
      expect(res.body.results[0].rarity.name).toBe('SSR');
    });

    it('rolls 10 pulls on /api/gacha/pull', async () => {
      const mockPool = {
        query: vi.fn()
          .mockResolvedValueOnce([[
            { id: 'sr', name: 'SR', color: '#8800ff', drop_rate: 100, sort_order: 2 },
          ], []])
          .mockResolvedValueOnce([[
            { id: 'c1', name: 'Knight', rarity_id: 'sr', image_path: 'knight.png', description: 'Noble knight' },
          ], []]),
      };
      vi.mocked(poolModule.getPool).mockReturnValue(mockPool as any);

      const res = await request(app)
        .post('/api/gacha/pull')
        .send({ count: 10 });
      expect(res.status).toBe(200);
      expect(res.body.results).toHaveLength(10);
    });

    it('returns 400 when gacha pool is empty', async () => {
      const mockPool = {
        query: vi.fn()
          .mockResolvedValueOnce([[], []])
          .mockResolvedValueOnce([[], []]),
      };
      vi.mocked(poolModule.getPool).mockReturnValue(mockPool as any);

      const res = await request(app)
        .post('/api/gacha/pull')
        .send({ count: 1 });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('empty');
    });
  });

  describe('Rarities Management', () => {
    it('lists rarities with card counts via GET /api/admin/rarities', async () => {
      const mockPool = {
        query: vi.fn().mockResolvedValueOnce([[
          { id: 'ssr', name: 'SSR', color: '#ff0000', drop_rate: 3, sort_order: 3, card_count: 5 },
          { id: 'r', name: 'R', color: '#0000ff', drop_rate: 97, sort_order: 1, card_count: 10 },
        ], []]),
      };
      vi.mocked(poolModule.getPool).mockReturnValue(mockPool as any);

      const res = await request(app)
        .get('/api/admin/rarities')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.rarities).toHaveLength(2);
    });

    it('rejects rarity creation with missing name or color', async () => {
      const res = await request(app)
        .post('/api/admin/rarities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ drop_rate: 5 });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Name and color are required');
    });

    it('rejects rarity creation with whitespace-only name', async () => {
      const res = await request(app)
        .post('/api/admin/rarities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '   ', color: '#ff0000' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Name and color are required');
    });

    it('creates rarity successfully', async () => {
      const mockPool = {
        query: vi.fn().mockResolvedValueOnce([{ insertId: 1 }, []]),
      };
      vi.mocked(poolModule.getPool).mockReturnValue(mockPool as any);

      const res = await request(app)
        .post('/api/admin/rarities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'UR', color: '#ffd700', drop_rate: 1, sort_order: 4 });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('UR');
      expect(res.body.color).toBe('#ffd700');
      expect(res.body.drop_rate).toBe(1);
      expect(res.body.id).toMatch(/^rarity-/);
    });

    it('updates rarity successfully', async () => {
      const mockPool = {
        query: vi.fn().mockResolvedValueOnce([{ affectedRows: 1 }, []]),
      };
      vi.mocked(poolModule.getPool).mockReturnValue(mockPool as any);

      const res = await request(app)
        .put('/api/admin/rarities/rarity-123')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'UR Updated', color: '#ffea00', drop_rate: 2, sort_order: 5 });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 404 when updating non-existent rarity', async () => {
      const mockPool = {
        query: vi.fn().mockResolvedValueOnce([{ affectedRows: 0 }, []]),
      };
      vi.mocked(poolModule.getPool).mockReturnValue(mockPool as any);

      const res = await request(app)
        .put('/api/admin/rarities/rarity-nonexistent')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'UR Updated', color: '#ffea00', drop_rate: 2, sort_order: 5 });
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Rarity not found');
    });

    it('prevents deletion of rarity with assigned cards', async () => {
      const mockPool = {
        query: vi.fn().mockResolvedValueOnce([[{ id: 'card-1' }], []]),
      };
      vi.mocked(poolModule.getPool).mockReturnValue(mockPool as any);

      const res = await request(app)
        .delete('/api/admin/rarities/rarity-ssr')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot delete rarity with assigned cards');
    });

    it('deletes rarity when no cards are assigned', async () => {
      const mockPool = {
        query: vi.fn()
          .mockResolvedValueOnce([[], []]) // SELECT id FROM cards WHERE rarity_id = ? -> empty
          .mockResolvedValueOnce([{ affectedRows: 1 }, []]), // DELETE FROM rarities
      };
      vi.mocked(poolModule.getPool).mockReturnValue(mockPool as any);

      const res = await request(app)
        .delete('/api/admin/rarities/rarity-unused')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Cards Management', () => {
    it('lists cards with joined rarity and supports rarity_id filter', async () => {
      const mockPool = {
        query: vi.fn().mockResolvedValueOnce([[
          {
            id: 'c1',
            name: 'Phoenix',
            rarity_id: 'ssr',
            rarity_name: 'SSR',
            rarity_color: '#ff0000',
            rarity_sort: 3,
            image_path: 'phoenix.png',
            description: 'Fire bird',
            created_at: new Date('2026-01-01'),
          },
        ], []]),
      };
      vi.mocked(poolModule.getPool).mockReturnValue(mockPool as any);

      const res = await request(app).get('/api/cards?rarity_id=ssr');
      expect(res.status).toBe(200);
      expect(res.body.cards).toHaveLength(1);
      expect(res.body.cards[0].name).toBe('Phoenix');
      expect(res.body.cards[0].rarity.name).toBe('SSR');
      expect(res.body.cards[0].image_url).toBe('/uploads/cards/phoenix.png');
    });

    it('rejects card creation without image file', async () => {
      const res = await request(app)
        .post('/api/admin/cards')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Card without image')
        .field('rarity_id', 'ssr');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Image file is required');
    });

    it('rejects card creation without name or rarity_id and cleans up uploaded file', async () => {
      const deleteImageSpy = vi.spyOn(storageService, 'deleteCardImage').mockResolvedValue(true);
      const res = await request(app)
        .post('/api/admin/cards')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', Buffer.from('fake-image-content'), {
          filename: 'test.png',
          contentType: 'image/png',
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Name and rarity_id are required');
      expect(deleteImageSpy).toHaveBeenCalled();
    });

    it('rejects card creation with whitespace-only name and cleans up uploaded file', async () => {
      const deleteImageSpy = vi.spyOn(storageService, 'deleteCardImage').mockResolvedValue(true);
      const res = await request(app)
        .post('/api/admin/cards')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', '    ')
        .field('rarity_id', 'ssr')
        .attach('image', Buffer.from('fake-image-content'), {
          filename: 'test.png',
          contentType: 'image/png',
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Name and rarity_id are required');
      expect(deleteImageSpy).toHaveBeenCalled();
    });

    it('creates card with image upload and saves to db', async () => {
      const mockPool = {
        query: vi.fn().mockResolvedValueOnce([{ insertId: 1 }, []]),
      };
      vi.mocked(poolModule.getPool).mockReturnValue(mockPool as any);

      const res = await request(app)
        .post('/api/admin/cards')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Shadow Assassin')
        .field('rarity_id', 'sr')
        .field('description', 'Stealthy rogue')
        .attach('image', Buffer.from('fake-image-content'), {
          filename: 'assassin.png',
          contentType: 'image/png',
        });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Shadow Assassin');
      expect(res.body.rarity_id).toBe('sr');
      expect(res.body.image_url).toMatch(/^\/uploads\/cards\/.+\.png$/);
    });

    it('deletes card from db and disk', async () => {
      const deleteImageSpy = vi.spyOn(storageService, 'deleteCardImage').mockResolvedValue(true);
      const mockPool = {
        query: vi.fn()
          .mockResolvedValueOnce([[{ image_path: 'card-to-delete.png' }], []])
          .mockResolvedValueOnce([{ affectedRows: 1 }, []]),
      };
      vi.mocked(poolModule.getPool).mockReturnValue(mockPool as any);

      const res = await request(app)
        .delete('/api/admin/cards/c123')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(deleteImageSpy).toHaveBeenCalledWith('card-to-delete.png');
    });

    it('returns 404 when deleting non-existent card', async () => {
      const mockPool = {
        query: vi.fn().mockResolvedValueOnce([[], []]),
      };
      vi.mocked(poolModule.getPool).mockReturnValue(mockPool as any);

      const res = await request(app)
        .delete('/api/admin/cards/c999')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });
  });

  describe('Static Card Uploads & Fallback', () => {
    it('serves fallback SVG if card image does not exist on disk', async () => {
      const res = await request(app).get('/uploads/cards/nonexistent-card.png');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('image/svg+xml');
      expect(res.text).toContain('nonexistent-card');
    });

    it('serves actual file if card image exists on disk', async () => {
      const testFile = path.join(config.storageDir, 'real-test-card.png');
      fs.writeFileSync(testFile, 'dummy-content');

      try {
        const res = await request(app).get('/uploads/cards/real-test-card.png');
        expect(res.status).toBe(200);
        expect(res.text).toBe('dummy-content');
      } finally {
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile);
        }
      }
    });

    it('serves client static index.html when dist exists', async () => {
      const mockClientDir = path.resolve(process.cwd(), '../client/dist');
      const existedBefore = fs.existsSync(mockClientDir);
      const indexHtmlPath = path.join(mockClientDir, 'index.html');
      const hadIndexHtml = fs.existsSync(indexHtmlPath);
      let originalContent: string | null = null;
      if (hadIndexHtml) {
        originalContent = fs.readFileSync(indexHtmlPath, 'utf-8');
      }

      fs.mkdirSync(mockClientDir, { recursive: true });
      fs.writeFileSync(indexHtmlPath, '<html><body>Client App</body></html>');

      try {
        const clientApp = createApp();
        const res = await request(clientApp).get('/some-route');
        expect(res.status).toBe(200);
        expect(res.text).toContain('Client App');
      } finally {
        if (originalContent !== null) {
          fs.writeFileSync(indexHtmlPath, originalContent);
        } else if (fs.existsSync(indexHtmlPath)) {
          fs.unlinkSync(indexHtmlPath);
        }
        if (!existedBefore && fs.existsSync(mockClientDir)) {
          try {
            fs.rmdirSync(mockClientDir);
          } catch {}
        }
      }
    });

    it('does not serve index.html for unhandled /api routes when client dist exists', async () => {
      const mockClientDir = path.resolve(process.cwd(), '../client/dist');
      const existedBefore = fs.existsSync(mockClientDir);
      const indexHtmlPath = path.join(mockClientDir, 'index.html');
      const hadIndexHtml = fs.existsSync(indexHtmlPath);
      let originalContent: string | null = null;
      if (hadIndexHtml) {
        originalContent = fs.readFileSync(indexHtmlPath, 'utf-8');
      }

      fs.mkdirSync(mockClientDir, { recursive: true });
      fs.writeFileSync(indexHtmlPath, '<html><body>Client App</body></html>');

      try {
        const clientApp = createApp();
        const res = await request(clientApp).get('/api/unhandled-endpoint');
        expect(res.status).toBe(404);
      } finally {
        if (originalContent !== null) {
          fs.writeFileSync(indexHtmlPath, originalContent);
        } else if (fs.existsSync(indexHtmlPath)) {
          fs.unlinkSync(indexHtmlPath);
        }
        if (!existedBefore && fs.existsSync(mockClientDir)) {
          try {
            fs.rmdirSync(mockClientDir);
          } catch {}
        }
      }
    });
  });

  describe('Error handling branches', () => {
    it('handles database error in listRarities', async () => {
      const mockPool = {
        query: vi.fn().mockRejectedValueOnce(new Error('DB failure in listRarities')),
      };
      vi.mocked(poolModule.getPool).mockReturnValue(mockPool as any);

      const res = await request(app)
        .get('/api/admin/rarities')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(500);
      expect(res.body.error).toContain('DB failure in listRarities');
    });

    it('handles database error in listCards', async () => {
      const mockPool = {
        query: vi.fn().mockRejectedValueOnce(new Error('DB failure in listCards')),
      };
      vi.mocked(poolModule.getPool).mockReturnValue(mockPool as any);

      const res = await request(app).get('/api/cards');
      expect(res.status).toBe(500);
      expect(res.body.error).toContain('DB failure in listCards');
    });

    it('handles database error in getRates', async () => {
      const mockPool = {
        query: vi.fn().mockRejectedValueOnce(new Error('DB failure in getRates')),
      };
      vi.mocked(poolModule.getPool).mockReturnValue(mockPool as any);

      const res = await request(app).get('/api/gacha/rates');
      expect(res.status).toBe(500);
      expect(res.body.error).toContain('DB failure in getRates');
    });

    it('handles database error in rollGacha', async () => {
      const mockPool = {
        query: vi.fn().mockRejectedValueOnce(new Error('DB failure in rollGacha')),
      };
      vi.mocked(poolModule.getPool).mockReturnValue(mockPool as any);

      const res = await request(app).post('/api/gacha/pull').send({ count: 1 });
      expect(res.status).toBe(500);
      expect(res.body.error).toContain('DB failure in rollGacha');
    });
    it('handles database error in createRarity', async () => {
      const mockPool = {
        query: vi.fn().mockRejectedValueOnce(new Error('DB duplicate key')),
      };
      vi.mocked(poolModule.getPool).mockReturnValue(mockPool as any);

      const res = await request(app)
        .post('/api/admin/rarities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'SSR', color: '#ff0000' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('DB duplicate key');
    });

    it('handles database error in updateRarity', async () => {
      const mockPool = {
        query: vi.fn().mockRejectedValueOnce(new Error('Update failed')),
      };
      vi.mocked(poolModule.getPool).mockReturnValue(mockPool as any);

      const res = await request(app)
        .put('/api/admin/rarities/r1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'SSR', color: '#ff0000' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Update failed');
    });

    it('handles database error in deleteRarity', async () => {
      const mockPool = {
        query: vi.fn().mockRejectedValueOnce(new Error('Delete check failed')),
      };
      vi.mocked(poolModule.getPool).mockReturnValue(mockPool as any);

      const res = await request(app)
        .delete('/api/admin/rarities/r1')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Delete check failed');
    });

    it('handles database error in createCard and deletes uploaded file', async () => {
      const deleteImageSpy = vi.spyOn(storageService, 'deleteCardImage').mockResolvedValue(true);
      const mockPool = {
        query: vi.fn().mockRejectedValueOnce(new Error('Card insert failed')),
      };
      vi.mocked(poolModule.getPool).mockReturnValue(mockPool as any);

      const res = await request(app)
        .post('/api/admin/cards')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Failed Card')
        .field('rarity_id', 'ssr')
        .attach('image', Buffer.from('fake-image'), { filename: 'test.png', contentType: 'image/png' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Card insert failed');
      expect(deleteImageSpy).toHaveBeenCalled();
    });

    it('handles database error in deleteCard', async () => {
      const mockPool = {
        query: vi.fn().mockRejectedValueOnce(new Error('Query card failed')),
      };
      vi.mocked(poolModule.getPool).mockReturnValue(mockPool as any);

      const res = await request(app)
        .delete('/api/admin/cards/c1')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Query card failed');
    });

    it('handles multer upload error and returns JSON 400', async () => {
      const res = await request(app)
        .post('/api/admin/cards')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Bad File Card')
        .field('rarity_id', 'ssr')
        .attach('image', Buffer.from('plain text'), { filename: 'test.txt', contentType: 'text/plain' });

      expect(res.status).toBe(400);
      expect(res.headers['content-type']).toContain('application/json');
      expect(res.body.error).toContain('Invalid file type');
    });

    it('handles multer unexpected field MulterError and returns JSON 400', async () => {
      const res = await request(app)
        .post('/api/admin/cards')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('unexpected_field', Buffer.from('fake'), { filename: 'test.png', contentType: 'image/png' });

      expect(res.status).toBe(400);
      expect(res.headers['content-type']).toContain('application/json');
      expect(res.body.error).toBeDefined();
    });
  });
});
