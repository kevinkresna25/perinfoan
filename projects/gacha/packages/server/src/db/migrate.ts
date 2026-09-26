import type { Pool } from 'mysql2/promise';

export async function runMigrations(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rarities (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE,
      color VARCHAR(20) NOT NULL,
      drop_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cards (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      rarity_id VARCHAR(36) NOT NULL,
      image_path VARCHAR(255) NOT NULL,
      description TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_cards_rarity FOREIGN KEY (rarity_id) REFERENCES rarities(id) ON DELETE RESTRICT
    );
  `);

  await pool.query(`
    INSERT IGNORE INTO rarities (id, name, color, drop_rate, sort_order) VALUES
      ('rarity-ssr', 'SSR', '#FFD700', 3.00, 3),
      ('rarity-sr',  'SR',  '#A855F7', 15.00, 2),
      ('rarity-r',   'R',   '#3B82F6', 32.00, 1),
      ('rarity-n',   'N',   '#9CA3AF', 50.00, 0);
  `);
}
