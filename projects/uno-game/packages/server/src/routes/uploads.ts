import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { RoomManager } from '../rooms/RoomManager.js';

export function createUploadRouter(roomManager: RoomManager): Router {
  const router = Router();

  const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
      const roomId = req.params.roomId;
      const uploadDir = path.resolve(process.cwd(), 'uploads', roomId);
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const slot = req.body.slot || 'custom';
      const ext = path.extname(file.originalname) || '.png';
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

  router.post('/rooms/:roomId/custom-images', upload.single('image'), (req, res) => {
    const { roomId } = req.params;
    const { slot } = req.body;

    const room = roomManager.getRoom(roomId);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    if (!req.file || !slot) {
      return res.status(400).json({ success: false, error: 'Image file and slot are required' });
    }

    const publicUrl = `/uploads/${roomId}/${req.file.filename}`;
    room.setCustomImage(slot, publicUrl);

    return res.json({
      success: true,
      slot,
      url: publicUrl
    });
  });

  return router;
}
