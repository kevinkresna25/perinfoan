import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { apiRouter } from './routes/api.js';
import { config } from './config/env.js';
import { getFallbackCardSvg } from './services/storageService.js';

export function createApp(): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Static uploaded cards with fallback
  app.get('/uploads/cards/:filename', (req, res) => {
    const filename = path.basename(req.params.filename);
    const fullPath = path.join(config.storageDir, filename);

    if (fs.existsSync(fullPath)) {
      res.sendFile(fullPath);
    } else {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(getFallbackCardSvg(filename.replace(/\.[^/.]+$/, '')));
    }
  });

  // API Router
  app.use('/api', apiRouter);

  // Serve static client bundle if it exists
  const clientDistCandidates = [
    path.resolve(process.cwd(), 'packages/client/dist'),
    path.resolve(process.cwd(), '../client/dist'),
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist'),
  ];
  const clientDist = clientDistCandidates.find((dir) => fs.existsSync(dir));
  if (clientDist) {
    app.use(express.static(clientDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
        return next();
      }
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  // Error-handling middleware
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err.status || (err.name === 'MulterError' ? 400 : 500);
    res.status(status).json({ error: err.message || 'Internal server error' });
  });

  return app;
}
