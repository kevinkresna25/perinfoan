import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { RoomManager } from '../src/rooms/RoomManager.js';
import { createUploadRouter } from '../src/routes/uploads.js';
import fs from 'fs';
import path from 'path';

describe('Uploads Router', () => {
  let app: express.Express;
  let roomManager: RoomManager;

  const createdRoomIds: string[] = [];

  beforeEach(() => {
    roomManager = new RoomManager();
    app = express();
    app.use(express.json());
    app.use('/api', createUploadRouter(roomManager));
  });

  afterEach(() => {
    roomManager.destroy();
    for (const id of createdRoomIds) {
      const roomUploadDir = path.resolve(process.cwd(), 'uploads', id);
      if (fs.existsSync(roomUploadDir)) {
        fs.rmSync(roomUploadDir, { recursive: true, force: true });
      }
    }
    createdRoomIds.length = 0;
  });

  it('returns 404 if room does not exist', async () => {
    const res = await request(app)
      .post('/api/rooms/NONEXIST/custom-images')
      .field('slot', 'wild')
      .attach('image', Buffer.from('fake image data'), {
        filename: 'test.png',
        contentType: 'image/png'
      });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: 'Room not found' });
  });

  it('returns 400 if image file or slot is missing', async () => {
    const room = roomManager.createRoom('Host', 30, 'p1', 's1');

    const resNoFile = await request(app)
      .post(`/api/rooms/${room.id}/custom-images`)
      .field('slot', 'wild');

    expect(resNoFile.status).toBe(400);
    expect(resNoFile.body.error).toBe('Image file and slot are required');
  });

  it('successfully uploads valid image for existing room', async () => {
    const room = roomManager.createRoom('Host', 30, 'p1', 's1');
    createdRoomIds.push(room.id);

    const res = await request(app)
      .post(`/api/rooms/${room.id}/custom-images`)
      .field('slot', 'wild')
      .attach('image', Buffer.from('fake-png-content'), {
        filename: 'avatar.png',
        contentType: 'image/png'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.slot).toBe('wild');
    expect(res.body.url).toBe(`/uploads/${room.id}/wild.png`);
    expect(room.state.customImages['wild']).toBe(`/uploads/${room.id}/wild.png`);
  });
});
