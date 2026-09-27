import { Router } from 'express';
import { adminLogin } from '../controllers/adminController.js';
import { requireAdmin } from '../middleware/auth.js';
import { listRarities, createRarity, updateRarity, deleteRarity } from '../controllers/rarityController.js';
import { listCards, createCard, deleteCard } from '../controllers/cardController.js';
import { getRates, rollGacha } from '../controllers/gachaController.js';
import { upload } from '../services/storageService.js';

export const apiRouter = Router();

// Public gacha routes
apiRouter.get('/gacha/rates', getRates);
apiRouter.post('/gacha/pull', rollGacha);
apiRouter.get('/cards', listCards);

// Admin auth
apiRouter.post('/admin/login', adminLogin);

// Protected Admin Rarities
apiRouter.get('/admin/rarities', requireAdmin, listRarities);
apiRouter.post('/admin/rarities', requireAdmin, createRarity);
apiRouter.put('/admin/rarities/:id', requireAdmin, updateRarity);
apiRouter.delete('/admin/rarities/:id', requireAdmin, deleteRarity);

// Protected Admin Cards
apiRouter.post('/admin/cards', requireAdmin, upload.single('image'), createCard);
apiRouter.delete('/admin/cards/:id', requireAdmin, deleteCard);
