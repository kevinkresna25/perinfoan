import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createUploadRouter } from '../src/routes/uploads.js';
import { RoomManager } from '../src/rooms/RoomManager.js';

describe('Custom Image Uploads Route', () => {
  it('accepts valid PNG image and attaches URL to room state', async () => {
    const app = express();
    const roomManager = new RoomManager();
    const room = roomManager.createRoom('Host', 30);
    app.use('/api', createUploadRouter(roomManager));

    const res = await request(app)
      .post(`/api/rooms/${room.id}/custom-images`)
      .field('slot', 'wild')
      .attach('image', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'wild.png');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(room.state.customImages.wild).toContain(`/uploads/${room.id}/`);
  });
});
