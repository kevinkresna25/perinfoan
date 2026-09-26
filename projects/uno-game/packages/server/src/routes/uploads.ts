import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { RoomManager } from '../rooms/RoomManager.js';

export function createUploadRouter(roomManager: RoomManager): Router {
  const router = Router();

  const SAFE_ROOM_ID = /^[A-Z0-9]{4,12}$/i;
  const SAFE_SLOT = /^[a-zA-Z0-9_-]{1,32}$/;

  const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
      const rawRoomId = req.params.roomId;
      const roomId = Array.isArray(rawRoomId) ? rawRoomId[0] : rawRoomId;
      if (!roomId || !SAFE_ROOM_ID.test(roomId)) {
        return cb(new Error('Invalid Room ID'), '');
      }
      const cleanRoomId = roomId.toUpperCase();
      const uploadDir = path.resolve(process.cwd(), 'uploads', cleanRoomId);
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const slot = req.body.slot || 'custom';
      if (!SAFE_SLOT.test(slot)) {
        return cb(new Error('Invalid slot name'), '');
      }
      const rawExt = path.extname(file.originalname).toLowerCase();
      const allowedExts = ['.png', '.jpg', '.jpeg', '.webp'];
      const ext = allowedExts.includes(rawExt) ? rawExt : '.png';
      cb(null, `${slot}${ext}`);
    }
  });

  const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (_req, file, cb) => {
      const allowed = ['image/png', 'image/jpeg', 'image/webp'];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only PNG, JPEG, and WebP images are allowed'));
      }
    }
  });

  router.post('/rooms/:roomId/custom-images', upload.single('image') as any, (req, res) => {
    const rawRoomId = req.params.roomId;
    const roomId = Array.isArray(rawRoomId) ? rawRoomId[0] : rawRoomId;
    if (!roomId || !SAFE_ROOM_ID.test(roomId)) {
      return res.status(400).json({ success: false, error: 'Invalid Room ID' });
    }
    const cleanRoomId = roomId.toUpperCase();
    const { slot } = req.body;
    if (!slot || !SAFE_SLOT.test(slot)) {
      return res.status(400).json({ success: false, error: 'Invalid or missing slot name' });
    }

    const room = roomManager.getRoom(cleanRoomId);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    const playerId = req.body.playerId || req.headers['x-player-id'];
    if (playerId) {
      const player = room.players.find(p => p.id === playerId);
      if (!player?.isHost) {
        return res.status(403).json({ success: false, error: 'Only room host can upload custom images' });
      }
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Image file and slot are required' });
    }

    const publicUrl = `/uploads/${cleanRoomId}/${req.file.filename}`;
    room.setCustomImage(slot, publicUrl);

    return res.json({
      success: true,
      slot,
      url: publicUrl
    });
  });

  return router;
}
