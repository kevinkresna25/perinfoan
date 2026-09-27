import { createApp } from './app.js';
import { config } from './config/env.js';
import { getPool } from './db/pool.js';
import { runMigrations } from './db/migrate.js';

async function start() {
  const pool = getPool();
  try {
    await runMigrations(pool);
    console.log('Database migrations verified successfully.');
  } catch (err) {
    console.error('Migration warning (will retry on next request):', err);
  }

  const app = createApp();
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`Gacha Server running on http://0.0.0.0:${config.port}`);
  });
}

start();
