CREATE DATABASE IF NOT EXISTS gacha_db;
USE gacha_db;

CREATE TABLE IF NOT EXISTS rarities (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  color VARCHAR(20) NOT NULL,
  drop_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cards (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  rarity_id VARCHAR(36) NOT NULL,
  image_path VARCHAR(255) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cards_rarity FOREIGN KEY (rarity_id) REFERENCES rarities(id) ON DELETE RESTRICT
);

INSERT IGNORE INTO rarities (id, name, color, drop_rate, sort_order) VALUES
  ('rarity-ssr', 'SSR', '#FFD700', 3.00, 3),
  ('rarity-sr',  'SR',  '#A855F7', 15.00, 2),
  ('rarity-r',   'R',   '#3B82F6', 32.00, 1),
  ('rarity-n',   'N',   '#9CA3AF', 50.00, 0);

-- Seed starter cards across all rarity tiers so game is immediately playable
INSERT IGNORE INTO cards (id, name, rarity_id, image_path, description) VALUES
  ('card-ssr-1', 'Cosmic Dragon',     'rarity-ssr', 'starter-cosmic-dragon.png',     'Ancient sovereign of starlight and PERINFOAN nebulae.'),
  ('card-ssr-2', 'Solar Valkyrie',    'rarity-ssr', 'starter-solar-valkyrie.png',    'Bringer of cosmic dawn and eternal golden radiance.'),
  ('card-sr-1',  'Void Assassin',     'rarity-sr',  'starter-void-assassin.png',     'Silent phantom dancing between spatial dimensions.'),
  ('card-sr-2',  'Astral Sorceress',  'rarity-sr',  'starter-astral-sorceress.png',  'Weaver of stellar constellations and arcane prophecies.'),
  ('card-r-1',   'Crystal Golem',     'rarity-r',   'starter-crystal-golem.png',     'Towering guardian forged from crystallized comet ore.'),
  ('card-r-2',   'Nebula Archer',     'rarity-r',   'starter-nebula-archer.png',     'Marksman whose arrows are carved from fallen meteors.'),
  ('card-n-1',   'Starlight Wisp',    'rarity-n',   'starter-starlight-wisp.png',    'A gentle glowing ember wandering the nocturnal sky.'),
  ('card-n-2',   'Novice Astrologer', 'rarity-n',   'starter-novice-astrologer.png', 'An apprentice recording the movements of distant moons.');
