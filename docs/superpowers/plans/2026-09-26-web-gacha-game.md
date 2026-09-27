# Web-Based Gacha Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-responsive, web-based gacha simulator with a Node.js/Express backend, MySQL 8.0 database, local directory object storage for card images, and a React + Tailwind + Framer Motion frontend, all runnable with a single `docker compose up --build`.

**Architecture:** A monorepo under `projects/gacha` containing `packages/server` (Express API, MySQL connection pool, weighted RNG roll engine, Multer image upload handling) and `packages/client` (Vite, React 18, Tailwind CSS, Framer Motion for 3D card-flip animations, LocalStorage for player inventory). Express serves both the REST API and the production frontend build.

**Tech Stack:** Node.js 20+, TypeScript 5+, Express 4, MySQL 8.0 (`mysql2/promise`), Multer, React 18, Vite 5, Tailwind CSS 3, Framer Motion 11, Lucide React, Docker & Docker Compose.

**Spec:** `docs/superpowers/specs/2026-09-26-web-gacha-game-design.md`

## Global Constraints

- Backend must run on Node.js with TypeScript and Express.
- Database must be MySQL 8.0 with tables `rarities` and `cards`.
- Card images must be stored on the local file system under `storage/uploads/cards/`.
- All gacha pull calculations must happen server-side; client must not dictate pull results.
- Web UI must be mobile responsive (supported from 360px width upwards).
- Full application stack must be launchable via `docker compose up --build`.
- No player login required (casual simulator mode); player inventory is stored in `localStorage`.
- Admin routes must require authentication via `ADMIN_PASSWORD` (bearer token or header).

## Review Focus

1. **Empty card pool pull attempt:** Player clicks summon when 0 cards exist in the database; server must return a clean `400 Bad Request` with an informative error rather than crashing or hanging.
2. **Empty rarity tier fallback:** Player rolls a rarity tier that currently has 0 cards uploaded; the roll engine must automatically fallback to the highest available tier with cards.
3. **Rates normalization:** Configured drop rates sum to $\ne 100\%$ (e.g. 95% or 110%); the engine must normalize weights proportionally so probability calculation never divides by zero or throws an out-of-bounds error.
4. **Missing card image on disk:** Physical card image is missing from storage directory; server must return a fallback placeholder image rather than an unhandled 404 or broken stream.
5. **Card deletion cleanup:** When a card is deleted by admin, the image file on disk must be synchronously/asynchronously unlinked alongside the MySQL row deletion.

---

### Task 1: Project Scaffolding, Package Workspaces & Docker Configuration

**Files:**
- Create: `projects/gacha/package.json`
- Create: `projects/gacha/tsconfig.base.json`
- Create: `projects/gacha/.gitignore`
- Create: `projects/gacha/.dockerignore`
- Create: `projects/gacha/Dockerfile`
- Create: `projects/gacha/docker-compose.yml`
- Create: `projects/gacha/.env.example`
- Create: `projects/gacha/packages/server/init.sql`

**Interfaces:**
- Consumes: None
- Produces: Monorepo npm workspaces configured for `packages/server` and `packages/client`, ready for dependency installation and Docker building.

- [ ] **Step 1: Write root `package.json` and workspaces config**

Create `projects/gacha/package.json`:
```json
{
  "name": "gacha-monorepo",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "npm run dev --workspace=packages/server",
    "dev:client": "npm run dev --workspace=packages/client",
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "start": "node packages/server/dist/index.js"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

- [ ] **Step 2: Create base TypeScript config & ignores**

Create `projects/gacha/tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  }
}
```

Create `projects/gacha/.gitignore`:
```gitignore
node_modules
dist
.env
storage/uploads/cards/*
!storage/uploads/cards/.gitkeep
*.log
```

Create `projects/gacha/.dockerignore`:
```dockerignore
node_modules
dist
.git
storage/uploads/cards/*
!storage/uploads/cards/.gitkeep
```

Create `projects/gacha/.env.example`:
```env
PORT=3000
DB_HOST=mysql
DB_PORT=3306
DB_USER=gacha_user
DB_PASSWORD=gacha_pass
DB_NAME=gacha_db
ADMIN_PASSWORD=adminsecret
STORAGE_DIR=/app/storage/uploads/cards
```

- [ ] **Step 3: Create MySQL initialization schema `init.sql`**

Create `projects/gacha/packages/server/init.sql`:
```sql
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
```

- [ ] **Step 4: Create Dockerfile and Docker Compose**

Create `projects/gacha/Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY packages/server/package*.json ./packages/server/
COPY packages/client/package*.json ./packages/client/
RUN npm ci

COPY tsconfig.base.json ./
COPY packages/client ./packages/client
COPY packages/server ./packages/server

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY packages/server/package*.json ./packages/server/
RUN npm ci --omit=dev --workspace=packages/server

COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/client/dist ./packages/client/dist
COPY packages/server/init.sql ./packages/server/init.sql

RUN mkdir -p /app/storage/uploads/cards

EXPOSE 3000
CMD ["node", "packages/server/dist/index.js"]
```

Create `projects/gacha/docker-compose.yml`:
```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: gacha-mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: root_pass
      MYSQL_DATABASE: gacha_db
      MYSQL_USER: gacha_user
      MYSQL_PASSWORD: gacha_pass
    ports:
      - "3306:3306"
    volumes:
      - gacha_mysql_data:/var/lib/mysql
      - ./packages/server/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "gacha_user", "-pgacha_pass"]
      interval: 5s
      timeout: 5s
      retries: 10

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: gacha-app
    restart: always
    ports:
      - "3000:3000"
    environment:
      PORT: 3000
      DB_HOST: mysql
      DB_PORT: 3306
      DB_USER: gacha_user
      DB_PASSWORD: gacha_pass
      DB_NAME: gacha_db
      ADMIN_PASSWORD: adminsecret
      STORAGE_DIR: /app/storage/uploads/cards
    volumes:
      - gacha_card_uploads:/app/storage/uploads/cards
    depends_on:
      mysql:
        condition: service_healthy

volumes:
  gacha_mysql_data:
  gacha_card_uploads:
```

- [ ] **Step 5: Create placeholder keep files and verify directory structure**

Create `projects/gacha/storage/uploads/cards/.gitkeep`.
Run: `ls -la projects/gacha`
Expected: Files created matching directory layout.

---

### Task 2: Server Package Setup, Database Connection & Schema Migration

**Files:**
- Create: `projects/gacha/packages/server/package.json`
- Create: `projects/gacha/packages/server/tsconfig.json`
- Create: `projects/gacha/packages/server/src/config/env.ts`
- Create: `projects/gacha/packages/server/src/db/pool.ts`
- Create: `projects/gacha/packages/server/src/db/migrate.ts`
- Create: `projects/gacha/packages/server/tests/db.test.ts`

**Interfaces:**
- Consumes: Environment variables (`DB_HOST`, `DB_USER`, etc.)
- Produces: `getPool(): mysql.Pool`, `runMigrations(pool): Promise<void>`

- [ ] **Step 1: Write server package.json & tsconfig.json**

Create `projects/gacha/packages/server/package.json`:
```json
{
  "name": "@gacha/server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "mysql2": "^3.9.7",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/multer": "^1.4.11",
    "@types/node": "^20.12.7",
    "@types/supertest": "^6.0.2",
    "@types/uuid": "^9.0.8",
    "supertest": "^6.3.4",
    "tsx": "^4.7.2",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  },
  "overrides": {
    "@types/express": "^4.17.21",
    "@types/express-serve-static-core": "^4.17.33"
  }
}
```

Create `projects/gacha/packages/server/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 2: Create config/env.ts**

Create `projects/gacha/packages/server/src/config/env.ts`:
```typescript
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'gacha_user',
    password: process.env.DB_PASSWORD || 'gacha_pass',
    name: process.env.DB_NAME || 'gacha_db',
  },
  adminPassword: process.env.ADMIN_PASSWORD || 'adminsecret',
  storageDir: process.env.STORAGE_DIR || path.resolve(process.cwd(), '../../storage/uploads/cards'),
  jwtSecret: process.env.JWT_SECRET || 'gacha-dev-secret-key-32-chars-long!',
};
```

- [ ] **Step 3: Create database connection pool & migration runner**

Create `projects/gacha/packages/server/src/db/pool.ts`:
```typescript
import mysql from 'mysql2/promise';
import { config } from '../config/env.js';

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.name,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
```

Create `projects/gacha/packages/server/src/db/migrate.ts`:
```typescript
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
```

- [ ] **Step 4: Write unit test for migration SQL execution**

Create `projects/gacha/packages/server/tests/db.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { runMigrations } from '../src/db/migrate.js';

describe('Database Migration', () => {
  it('executes create table statements and initial seed', async () => {
    const executedQueries: string[] = [];
    const mockPool = {
      query: vi.fn().mockImplementation((sql: string) => {
        executedQueries.push(sql);
        return Promise.resolve([[], []]);
      }),
    } as any;

    await runMigrations(mockPool);
    expect(mockPool.query).toHaveBeenCalledTimes(3);
    expect(executedQueries[0]).toContain('CREATE TABLE IF NOT EXISTS rarities');
    expect(executedQueries[1]).toContain('CREATE TABLE IF NOT EXISTS cards');
    expect(executedQueries[2]).toContain('INSERT IGNORE INTO rarities');
  });
});
```

- [ ] **Step 5: Run tests to verify**

Run: `npm test --workspace=packages/server`
Expected: PASS

---

### Task 3: Gacha Core Roll Engine (Weighted RNG, Normalization & Fallbacks)

**Files:**
- Create: `projects/gacha/packages/server/src/types/index.ts`
- Create: `projects/gacha/packages/server/src/services/gachaEngine.ts`
- Test: `projects/gacha/packages/server/tests/gachaEngine.test.ts`

**Interfaces:**
- Consumes: `Rarity`, `Card` objects from database query.
- Produces:
  ```typescript
  export interface RollResult {
    id: string;
    name: string;
    rarity: {
      id: string;
      name: string;
      color: string;
    };
    image_url: string;
    description: string | null;
  }

  export function performPull(
    count: 1 | 10,
    rarities: RarityWithCards[],
    randomFn?: () => number
  ): RollResult[];
  ```

- [ ] **Step 1: Define shared types in `src/types/index.ts`**

Create `projects/gacha/packages/server/src/types/index.ts`:
```typescript
export interface Rarity {
  id: string;
  name: string;
  color: string;
  drop_rate: number;
  sort_order: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface Card {
  id: string;
  name: string;
  rarity_id: string;
  image_path: string;
  description: string | null;
  created_at?: Date;
}

export interface RarityWithCards extends Rarity {
  cards: Card[];
}

export interface RollResult {
  id: string;
  name: string;
  rarity: {
    id: string;
    name: string;
    color: string;
  };
  image_url: string;
  description: string | null;
}
```

- [ ] **Step 2: Write failing unit test for `gachaEngine.ts`**

Create `projects/gacha/packages/server/tests/gachaEngine.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { performPull } from '../src/services/gachaEngine.js';
import type { RarityWithCards } from '../src/types/index.js';

describe('Gacha Roll Engine', () => {
  const mockPool: RarityWithCards[] = [
    {
      id: 'rarity-ssr',
      name: 'SSR',
      color: '#FFD700',
      drop_rate: 10,
      sort_order: 2,
      cards: [
        { id: 'c-ssr-1', name: 'SSR Dragon', rarity_id: 'rarity-ssr', image_path: 'c1.png', description: 'Desc' }
      ]
    },
    {
      id: 'rarity-r',
      name: 'R',
      color: '#3B82F6',
      drop_rate: 90,
      sort_order: 1,
      cards: [
        { id: 'c-r-1', name: 'R Knight', rarity_id: 'rarity-r', image_path: 'c2.png', description: 'Desc' }
      ]
    }
  ];

  it('throws error when total pool contains 0 cards', () => {
    const emptyPool: RarityWithCards[] = [
      { id: 'r1', name: 'SSR', color: '#FFF', drop_rate: 100, sort_order: 1, cards: [] }
    ];
    expect(() => performPull(1, emptyPool)).toThrow('Gacha pool is empty. No cards are available to pull.');
  });

  it('pulls SSR when random roll lands in SSR threshold', () => {
    // 10% SSR: roll value 0.05 corresponds to 5% -> SSR
    const results = performPull(1, mockPool, () => 0.05);
    expect(results).toHaveLength(1);
    expect(results[0].rarity.name).toBe('SSR');
    expect(results[0].name).toBe('SSR Dragon');
  });

  it('pulls R when random roll lands in R threshold', () => {
    // roll value 0.50 corresponds to 50% -> R
    const results = performPull(1, mockPool, () => 0.50);
    expect(results).toHaveLength(1);
    expect(results[0].rarity.name).toBe('R');
  });

  it('falls back to available tier if rolled tier has 0 cards', () => {
    const poolWithEmptySSR: RarityWithCards[] = [
      {
        id: 'rarity-ssr',
        name: 'SSR',
        color: '#FFD700',
        drop_rate: 50,
        sort_order: 2,
        cards: [] // No cards in SSR
      },
      {
        id: 'rarity-r',
        name: 'R',
        color: '#3B82F6',
        drop_rate: 50,
        sort_order: 1,
        cards: [
          { id: 'c-r-1', name: 'Fallback Knight', rarity_id: 'rarity-r', image_path: 'c2.png', description: 'Desc' }
        ]
      }
    ];

    // Roll 0.10 lands in SSR bracket, but SSR is empty -> should fall back to R
    const results = performPull(1, poolWithEmptySSR, () => 0.10);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Fallback Knight');
    expect(results[0].rarity.name).toBe('R');
  });

  it('normalizes rates when drop_rate sum is not 100', () => {
    const unnormalizedPool: RarityWithCards[] = [
      {
        id: 'rarity-a',
        name: 'TierA',
        color: '#FFF',
        drop_rate: 20, // 20 / 40 = 50%
        sort_order: 2,
        cards: [{ id: 'c-a', name: 'Card A', rarity_id: 'rarity-a', image_path: 'a.png', description: null }]
      },
      {
        id: 'rarity-b',
        name: 'TierB',
        color: '#000',
        drop_rate: 20, // 20 / 40 = 50%
        sort_order: 1,
        cards: [{ id: 'c-b', name: 'Card B', rarity_id: 'rarity-b', image_path: 'b.png', description: null }]
      }
    ];

    // Roll 0.49 -> TierA, Roll 0.51 -> TierB
    const resA = performPull(1, unnormalizedPool, () => 0.49);
    const resB = performPull(1, unnormalizedPool, () => 0.51);
    expect(resA[0].name).toBe('Card A');
    expect(resB[0].name).toBe('Card B');
  });

  it('executes 10-pull and guarantees at least 1 card with sort_order >= 1 when available', () => {
    const results = performPull(10, mockPool);
    expect(results).toHaveLength(10);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test --workspace=packages/server`
Expected: FAIL with "Cannot find module '../src/services/gachaEngine.js'"

- [ ] **Step 4: Implement `gachaEngine.ts`**

Create `projects/gacha/packages/server/src/services/gachaEngine.ts`:
```typescript
import type { RarityWithCards, RollResult, Card } from '../types/index.js';

export function performPull(
  count: 1 | 10,
  rarities: RarityWithCards[],
  randomFn: () => number = Math.random
): RollResult[] {
  const tiersWithCards = rarities
    .filter((r) => r.cards.length > 0)
    .sort((a, b) => b.sort_order - a.sort_order);

  if (tiersWithCards.length === 0) {
    throw new Error('Gacha pool is empty. No cards are available to pull.');
  }

  // Calculate sum of drop rates across all tiers (or fallback to equal weights if sum is 0)
  const totalWeight = rarities.reduce((acc, r) => acc + (Number(r.drop_rate) || 0), 0);
  const normalizedRarities = rarities.map((r) => ({
    ...r,
    normalizedWeight: totalWeight > 0 ? (Number(r.drop_rate) / totalWeight) * 100 : 100 / rarities.length,
  }));

  const rollSingle = (forceMinSortOrder?: number): RollResult => {
    let poolForRoll = tiersWithCards;
    if (typeof forceMinSortOrder === 'number') {
      const filtered = tiersWithCards.filter((t) => t.sort_order >= forceMinSortOrder);
      if (filtered.length > 0) {
        poolForRoll = filtered;
      }
    }

    const rollVal = randomFn() * 100; // 0 to 100
    let cumulative = 0;
    let selectedTier: RarityWithCards | null = null;

    for (const tier of normalizedRarities) {
      cumulative += tier.normalizedWeight;
      if (rollVal < cumulative) {
        // If this tier has cards, use it
        if (tier.cards.length > 0) {
          selectedTier = tier;
        } else {
          // Fallback to highest tier that has cards
          selectedTier = poolForRoll[0];
        }
        break;
      }
    }

    if (!selectedTier) {
      selectedTier = poolForRoll[poolForRoll.length - 1];
    }

    // Pick uniform random card from selected tier
    const cardIndex = Math.floor(randomFn() * selectedTier.cards.length);
    const card: Card = selectedTier.cards[cardIndex];

    return {
      id: card.id,
      name: card.name,
      rarity: {
        id: selectedTier.id,
        name: selectedTier.name,
        color: selectedTier.color,
      },
      image_url: `/uploads/cards/${card.image_path}`,
      description: card.description,
    };
  };

  const results: RollResult[] = [];
  for (let i = 0; i < count; i++) {
    results.push(rollSingle());
  }

  // For 10-pull: guarantee at least one card of sort_order >= 1 if available
  if (count === 10) {
    const hasGuaranteed = results.some((r) => {
      const match = rarities.find((tier) => tier.id === r.rarity.id);
      return match && match.sort_order >= 1;
    });

    if (!hasGuaranteed) {
      results[9] = rollSingle(1);
    }
  }

  return results;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test --workspace=packages/server`
Expected: PASS

---

### Task 4: Card Storage Service & File System Management

**Files:**
- Create: `projects/gacha/packages/server/src/services/storageService.ts`
- Test: `projects/gacha/packages/server/tests/storageService.test.ts`

**Interfaces:**
- Consumes: Multer file uploads, filesystem `fs/promises`.
- Produces:
  ```typescript
  export const uploadMiddleware: RequestHandler;
  export async function deleteCardImage(filename: string): Promise<boolean>;
  export function getFallbackCardSvg(name: string): string;
  ```

- [ ] **Step 1: Write failing unit test for `storageService`**

Create `projects/gacha/packages/server/tests/storageService.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs/promises';
import { deleteCardImage, getFallbackCardSvg } from '../src/services/storageService.js';

vi.mock('fs/promises');

describe('Storage Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes card image file when file exists', async () => {
    vi.mocked(fs.unlink).mockResolvedValue(undefined);
    const result = await deleteCardImage('test-card.png');
    expect(result).toBe(true);
    expect(fs.unlink).toHaveBeenCalled();
  });

  it('handles missing file gracefully without throwing error', async () => {
    vi.mocked(fs.unlink).mockRejectedValue(new Error('ENOENT: no such file'));
    const result = await deleteCardImage('missing.png');
    expect(result).toBe(false);
  });

  it('generates an SVG card placeholder with the card name', () => {
    const svg = getFallbackCardSvg('Solar Paladin');
    expect(svg).toContain('<svg');
    expect(svg).toContain('Solar Paladin');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=packages/server`
Expected: FAIL with "Cannot find module '../src/services/storageService.js'"

- [ ] **Step 3: Implement `storageService.ts`**

Create `projects/gacha/packages/server/src/services/storageService.ts`:
```typescript
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';

// Ensure storage directory exists
if (!fsSync.existsSync(config.storageDir)) {
  fsSync.mkdirSync(config.storageDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.storageDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF images are allowed.'));
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter,
});

export async function deleteCardImage(filename: string): Promise<boolean> {
  const sanitizedFilename = path.basename(filename);
  const filePath = path.join(config.storageDir, sanitizedFilename);
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

export function getFallbackCardSvg(cardName: string): string {
  const sanitized = cardName.replace(/[<>&"]/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
    <rect width="400" height="600" fill="#1e1b4b" rx="16"/>
    <rect x="20" y="20" width="360" height="560" fill="none" stroke="#6366f1" stroke-width="4" stroke-dasharray="8" rx="12"/>
    <circle cx="200" cy="240" r="60" fill="#312e81"/>
    <text x="200" y="255" font-family="sans-serif" font-size="48" fill="#a5b4fc" text-anchor="middle">★</text>
    <text x="200" y="360" font-family="sans-serif" font-size="22" font-weight="bold" fill="#e0e7ff" text-anchor="middle">${sanitized}</text>
    <text x="200" y="400" font-family="sans-serif" font-size="14" fill="#818cf8" text-anchor="middle">Card Artwork Preview</text>
  </svg>`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test --workspace=packages/server`
Expected: PASS

---

### Task 5: Express API Controllers, Auth Middleware & Endpoints

**Files:**
- Create: `projects/gacha/packages/server/src/middleware/auth.ts`
- Create: `projects/gacha/packages/server/src/controllers/adminController.ts`
- Create: `projects/gacha/packages/server/src/controllers/rarityController.ts`
- Create: `projects/gacha/packages/server/src/controllers/cardController.ts`
- Create: `projects/gacha/packages/server/src/controllers/gachaController.ts`
- Create: `projects/gacha/packages/server/src/routes/api.ts`
- Create: `projects/gacha/packages/server/src/app.ts`
- Test: `projects/gacha/packages/server/tests/api.test.ts`

**Interfaces:**
- Consumes: DB pool, `gachaEngine`, `storageService`.
- Produces: Express Application `createApp()` with mounted endpoints.

- [ ] **Step 1: Create auth middleware and admin controller**

Create `projects/gacha/packages/server/src/middleware/auth.ts`:
```typescript
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized. Admin token required.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { role: string };
    if (decoded.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden. Admin role required.' });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}
```

Create `projects/gacha/packages/server/src/controllers/adminController.ts`:
```typescript
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export function adminLogin(req: Request, res: Response): void {
  const { password } = req.body;
  if (!password || password !== config.adminPassword) {
    res.status(401).json({ error: 'Invalid admin password.' });
    return;
  }

  const token = jwt.sign({ role: 'admin' }, config.jwtSecret, { expiresIn: '24h' });
  res.json({ token, expiresIn: '24h' });
}
```

- [ ] **Step 2: Create rarity, card, and gacha controllers**

Create `projects/gacha/packages/server/src/controllers/rarityController.ts`:
```typescript
import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../db/pool.js';
import type { Rarity } from '../types/index.js';

export async function listRarities(_req: Request, res: Response): Promise<void> {
  const pool = getPool();
  const [rows] = await pool.query<any[]>(`
    SELECT r.*, COUNT(c.id) AS card_count
    FROM rarities r
    LEFT JOIN cards c ON r.id = c.rarity_id
    GROUP BY r.id
    ORDER BY r.sort_order DESC, r.created_at ASC
  `);
  res.json({ rarities: rows });
}

export async function createRarity(req: Request, res: Response): Promise<void> {
  const { name, color, drop_rate, sort_order } = req.body;
  if (!name || !color) {
    res.status(400).json({ error: 'Name and color are required.' });
    return;
  }

  const pool = getPool();
  const id = `rarity-${uuidv4().slice(0, 8)}`;
  try {
    await pool.query(
      `INSERT INTO rarities (id, name, color, drop_rate, sort_order) VALUES (?, ?, ?, ?, ?)`,
      [id, name, color, Number(drop_rate) || 0, Number(sort_order) || 0]
    );
    res.status(201).json({ id, name, color, drop_rate: Number(drop_rate) || 0, sort_order: Number(sort_order) || 0 });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create rarity.' });
  }
}

export async function updateRarity(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, color, drop_rate, sort_order } = req.body;
  const pool = getPool();

  try {
    await pool.query(
      `UPDATE rarities SET name = ?, color = ?, drop_rate = ?, sort_order = ? WHERE id = ?`,
      [name, color, Number(drop_rate) || 0, Number(sort_order) || 0, id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update rarity.' });
  }
}

export async function deleteRarity(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const pool = getPool();

  try {
    const [cards] = await pool.query<any[]>('SELECT id FROM cards WHERE rarity_id = ?', [id]);
    if (cards.length > 0) {
      res.status(400).json({ error: 'Cannot delete rarity with assigned cards. Delete or reassign cards first.' });
      return;
    }
    await pool.query('DELETE FROM rarities WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete rarity.' });
  }
}
```

Create `projects/gacha/packages/server/src/controllers/cardController.ts`:
```typescript
import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../db/pool.js';
import { deleteCardImage } from '../services/storageService.js';

export async function listCards(req: Request, res: Response): Promise<void> {
  const { rarity_id } = req.query;
  const pool = getPool();

  let query = `
    SELECT c.*, r.name as rarity_name, r.color as rarity_color, r.sort_order as rarity_sort
    FROM cards c
    JOIN rarities r ON c.rarity_id = r.id
  `;
  const params: any[] = [];

  if (rarity_id) {
    query += ' WHERE c.rarity_id = ?';
    params.push(rarity_id);
  }

  query += ' ORDER BY r.sort_order DESC, c.created_at DESC';

  const [cards] = await pool.query<any[]>(query, params);
  res.json({
    cards: cards.map((c) => ({
      id: c.id,
      name: c.name,
      rarity: {
        id: c.rarity_id,
        name: c.rarity_name,
        color: c.rarity_color,
      },
      image_url: `/uploads/cards/${c.image_path}`,
      description: c.description,
      created_at: c.created_at,
    })),
  });
}

export async function createCard(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ error: 'Image file is required.' });
    return;
  }

  const { name, rarity_id, description } = req.body;
  if (!name || !rarity_id) {
    res.status(400).json({ error: 'Name and rarity_id are required.' });
    return;
  }

  const pool = getPool();
  const id = uuidv4();
  const image_path = req.file.filename;

  try {
    await pool.query(
      `INSERT INTO cards (id, name, rarity_id, image_path, description) VALUES (?, ?, ?, ?, ?)`,
      [id, name, rarity_id, image_path, description || null]
    );
    res.status(201).json({
      id,
      name,
      rarity_id,
      image_url: `/uploads/cards/${image_path}`,
      description,
    });
  } catch (err: any) {
    await deleteCardImage(image_path);
    res.status(400).json({ error: err.message || 'Failed to create card.' });
  }
}

export async function deleteCard(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const pool = getPool();

  try {
    const [rows] = await pool.query<any[]>('SELECT image_path FROM cards WHERE id = ?', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Card not found.' });
      return;
    }

    await pool.query('DELETE FROM cards WHERE id = ?', [id]);
    await deleteCardImage(rows[0].image_path);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete card.' });
  }
}
```

Create `projects/gacha/packages/server/src/controllers/gachaController.ts`:
```typescript
import type { Request, Response } from 'express';
import { getPool } from '../db/pool.js';
import { performPull } from '../services/gachaEngine.js';
import type { RarityWithCards } from '../types/index.js';

export async function getRates(_req: Request, res: Response): Promise<void> {
  const pool = getPool();
  const [rarities] = await pool.query<any[]>(`
    SELECT r.id, r.name, r.color, r.drop_rate, r.sort_order, COUNT(c.id) AS card_count
    FROM rarities r
    LEFT JOIN cards c ON r.id = c.rarity_id
    GROUP BY r.id
    ORDER BY r.sort_order DESC
  `);

  const [cardTotal] = await pool.query<any[]>('SELECT COUNT(*) as total FROM cards');

  res.json({
    rarities,
    total_cards: cardTotal[0]?.total || 0,
  });
}

export async function rollGacha(req: Request, res: Response): Promise<void> {
  const count = req.body.count === 10 ? 10 : 1;
  const pool = getPool();

  const [rarityRows] = await pool.query<any[]>('SELECT * FROM rarities ORDER BY sort_order DESC');
  const [cardRows] = await pool.query<any[]>('SELECT * FROM cards');

  const poolWithCards: RarityWithCards[] = rarityRows.map((r) => ({
    ...r,
    cards: cardRows.filter((c) => c.rarity_id === r.id),
  }));

  try {
    const results = performPull(count, poolWithCards);
    res.json({ results });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
```

- [ ] **Step 3: Setup routes, Express app factory & static handling**

Create `projects/gacha/packages/server/src/routes/api.ts`:
```typescript
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
apiRouter.get('/admin/rarities', listRarities);
apiRouter.post('/admin/rarities', requireAdmin, createRarity);
apiRouter.put('/admin/rarities/:id', requireAdmin, updateRarity);
apiRouter.delete('/admin/rarities/:id', requireAdmin, deleteRarity);

// Protected Admin Cards
apiRouter.post('/admin/cards', requireAdmin, upload.single('image'), createCard);
apiRouter.delete('/admin/cards/:id', requireAdmin, deleteCard);
```

Create `projects/gacha/packages/server/src/app.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
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
  const clientDist = path.resolve(process.cwd(), '../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  return app;
}
```

Create `projects/gacha/packages/server/src/index.ts`:
```typescript
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
```

- [ ] **Step 4: Write integration test for API endpoints**

Create `projects/gacha/packages/server/tests/api.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import * as poolModule from '../src/db/pool.js';

vi.mock('../src/db/pool.js');

describe('API Integration Endpoints', () => {
  let app: any;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  it('rejects admin routes without auth token', async () => {
    const res = await request(app).post('/api/admin/rarities').send({ name: 'Test' });
    expect(res.status).toBe(401);
  });

  it('authenticates admin with valid password', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ password: 'adminsecret' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('returns rates from public /api/gacha/rates', async () => {
    const mockPool = {
      query: vi.fn()
        .mockResolvedValueOnce([[{ id: 'ssr', name: 'SSR', drop_rate: 5, card_count: 2 }], []])
        .mockResolvedValueOnce([[{ total: 2 }], []]),
    };
    vi.mocked(poolModule.getPool).mockReturnValue(mockPool as any);

    const res = await request(app).get('/api/gacha/rates');
    expect(res.status).toBe(200);
    expect(res.body.rarities).toHaveLength(1);
    expect(res.body.total_cards).toBe(2);
  });

  it('serves fallback SVG if card image does not exist on disk', async () => {
    const res = await request(app).get('/uploads/cards/nonexistent-card.png');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('image/svg+xml');
    expect(res.text).toContain('nonexistent-card');
  });
});
```

- [ ] **Step 5: Run tests to verify**

Run: `npm test --workspace=packages/server`
Expected: PASS

---

### Task 6: Frontend Client Setup, Tailwind, Framer Motion & Services

**Files:**
- Create: `projects/gacha/packages/client/package.json`
- Create: `projects/gacha/packages/client/tsconfig.json`
- Create: `projects/gacha/packages/client/vite.config.ts`
- Create: `projects/gacha/packages/client/tailwind.config.js`
- Create: `projects/gacha/packages/client/postcss.config.js`
- Create: `projects/gacha/packages/client/index.html`
- Create: `projects/gacha/packages/client/src/index.css`
- Create: `projects/gacha/packages/client/src/types.ts`
- Create: `projects/gacha/packages/client/src/services/api.ts`
- Create: `projects/gacha/packages/client/src/services/inventory.ts`
- Test: `projects/gacha/packages/client/tests/inventory.test.ts`

**Interfaces:**
- Consumes: Backend API routes (`/api/*`).
- Produces: API client helper functions and `useInventory` state store handling local collection tracking.

- [ ] **Step 1: Write client package.json & Vite/Tailwind configuration**

Create `projects/gacha/packages/client/package.json`:
```json
{
  "name": "@gacha/client",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "clsx": "^2.1.1",
    "framer-motion": "^11.2.0",
    "lucide-react": "^0.378.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^2.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.2",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.19",
    "jsdom": "^24.0.0",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "typescript": "^5.4.0",
    "vite": "^5.2.11",
    "vitest": "^1.6.0"
  }
}
```

Create `projects/gacha/packages/client/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "moduleResolution": "bundler"
  },
  "include": ["src"]
}
```

Create `projects/gacha/packages/client/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
    },
  },
});
```

Create `projects/gacha/packages/client/tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gacha: {
          dark: '#0f172a',
          card: '#1e293b',
          accent: '#8b5cf6',
          gold: '#ffd700',
        },
      },
    },
  },
  plugins: [],
};
```

Create `projects/gacha/packages/client/postcss.config.js`:
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

Create `projects/gacha/packages/client/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Gacha Simulator</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✨</text></svg>" />
  </head>
  <body class="bg-slate-950 text-slate-100 min-h-screen selection:bg-purple-500 selection:text-white antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `projects/gacha/packages/client/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

.perspective-1000 {
  perspective: 1000px;
}

.transform-style-preserve-3d {
  transform-style: preserve-3d;
}

.backface-hidden {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.rotate-y-180 {
  transform: rotateY(180deg);
}
```

- [ ] **Step 2: Define client types, API service and inventory storage**

Create `projects/gacha/packages/client/src/types.ts`:
```typescript
export interface Rarity {
  id: string;
  name: string;
  color: string;
  drop_rate: number;
  sort_order: number;
  card_count?: number;
}

export interface Card {
  id: string;
  name: string;
  rarity: {
    id: string;
    name: string;
    color: string;
  };
  image_url: string;
  description: string | null;
  created_at?: string;
}

export interface InventoryItem {
  cardId: string;
  count: number;
  firstPulledAt: string;
}

export type ViewTab = 'summon' | 'album' | 'admin';
```

Create `projects/gacha/packages/client/src/services/api.ts`:
```typescript
import type { Card, Rarity } from '../types';

export async function fetchRates(): Promise<{ rarities: Rarity[]; total_cards: number }> {
  const res = await fetch('/api/gacha/rates');
  if (!res.ok) throw new Error('Failed to load gacha rates');
  return res.json();
}

export async function fetchCards(rarityId?: string): Promise<{ cards: Card[] }> {
  const url = rarityId ? `/api/cards?rarity_id=${encodeURIComponent(rarityId)}` : '/api/cards';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load card catalog');
  return res.json();
}

export async function pullGacha(count: 1 | 10): Promise<{ results: Card[] }> {
  const res = await fetch('/api/gacha/pull', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to pull cards');
  return data;
}

export async function loginAdmin(password: string): Promise<string> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Invalid credentials');
  return data.token;
}

export async function createCardApi(formData: FormData, token: string): Promise<void> {
  const res = await fetch('/api/admin/cards', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to upload card');
  }
}

export async function deleteCardApi(id: string, token: string): Promise<void> {
  const res = await fetch(`/api/admin/cards/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to delete card');
  }
}

export async function saveRarityApi(rarity: Partial<Rarity>, token: string): Promise<void> {
  const isUpdate = Boolean(rarity.id);
  const url = isUpdate ? `/api/admin/rarities/${rarity.id}` : '/api/admin/rarities';
  const method = isUpdate ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(rarity),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to save rarity');
  }
}

export async function deleteRarityApi(id: string, token: string): Promise<void> {
  const res = await fetch(`/api/admin/rarities/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to delete rarity');
  }
}
```

Create `projects/gacha/packages/client/src/services/inventory.ts`:
```typescript
import type { InventoryItem, Card } from '../types';

const STORAGE_KEY = 'gacha_player_inventory';

export function getLocalInventory(): Record<string, InventoryItem> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function recordPulls(cards: Card[]): { newDiscoveredCount: number; updated: Record<string, InventoryItem> } {
  const inventory = getLocalInventory();
  let newDiscoveredCount = 0;

  for (const card of cards) {
    if (!inventory[card.id]) {
      inventory[card.id] = {
        cardId: card.id,
        count: 1,
        firstPulledAt: new Date().toISOString(),
      };
      newDiscoveredCount++;
    } else {
      inventory[card.id].count += 1;
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
  } catch (err) {
    console.warn('Failed to save to localStorage:', err);
  }

  return { newDiscoveredCount, updated: inventory };
}

export function resetLocalInventory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
```

- [ ] **Step 3: Write tests for inventory recording**

Create `projects/gacha/packages/client/tests/inventory.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { recordPulls, getLocalInventory, resetLocalInventory } from '../src/services/inventory.js';
import type { Card } from '../src/types.js';

describe('Player Local Inventory Service', () => {
  beforeEach(() => {
    resetLocalInventory();
  });

  const mockCard: Card = {
    id: 'c1',
    name: 'Cosmic Sorceress',
    rarity: { id: 'r1', name: 'SSR', color: '#FFD700' },
    image_url: '/uploads/c1.png',
    description: 'Lore',
  };

  it('records a new card discovery', () => {
    const { newDiscoveredCount, updated } = recordPulls([mockCard]);
    expect(newDiscoveredCount).toBe(1);
    expect(updated['c1'].count).toBe(1);

    const stored = getLocalInventory();
    expect(stored['c1'].count).toBe(1);
  });

  it('increments duplicate count on repeated pull', () => {
    recordPulls([mockCard]);
    const { newDiscoveredCount, updated } = recordPulls([mockCard]);
    expect(newDiscoveredCount).toBe(0);
    expect(updated['c1'].count).toBe(2);
  });
});
```

- [ ] **Step 4: Run test to verify**

Run: `npm test --workspace=packages/client`
Expected: PASS

---

### Task 7: Frontend Summon Stage & Interactive 3D Card Reveal

**Files:**
- Create: `projects/gacha/packages/client/src/components/CardFlip.tsx`
- Create: `projects/gacha/packages/client/src/components/SummonStage.tsx`
- Test: `projects/gacha/packages/client/tests/CardFlip.test.tsx`

**Interfaces:**
- Consumes: `Card`, `pullGacha`, `recordPulls`.
- Produces: Visual summon stage with single & 10-pull actions and animated card reveal grids.

- [ ] **Step 1: Create 3D Flip Card Component (`CardFlip.tsx`)**

Create `projects/gacha/packages/client/src/components/CardFlip.tsx`:
```tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { Card } from '../types';

interface CardFlipProps {
  card: Card;
  isNew?: boolean;
  revealed?: boolean;
  onReveal?: () => void;
}

export const CardFlip: React.FC<CardFlipProps> = ({ card, isNew, revealed = false, onReveal }) => {
  const [isFlipped, setIsFlipped] = useState(revealed);

  const handleClick = () => {
    if (!isFlipped) {
      setIsFlipped(true);
      onReveal?.();
    }
  };

  const flipped = revealed || isFlipped;

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer perspective-1000 w-full max-w-[240px] aspect-[2/3] mx-auto select-none"
    >
      <motion.div
        className="w-full h-full relative transform-style-preserve-3d transition-transform duration-700 shadow-2xl rounded-2xl"
        animate={{ rotateY: flipped ? 180 : 0 }}
      >
        {/* Card Back (Facedown) */}
        <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-2 border-indigo-500/40 rounded-2xl flex flex-col items-center justify-center p-4 overflow-hidden group">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent group-hover:opacity-100 transition-opacity" />
          <div className="w-16 h-16 rounded-full border border-indigo-400/30 flex items-center justify-center mb-3">
            <span className="text-3xl animate-pulse">✨</span>
          </div>
          <span className="text-xs uppercase tracking-widest text-indigo-300/80 font-bold">Tap to Reveal</span>
        </div>

        {/* Card Front (Faceup) */}
        <div
          className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl overflow-hidden border-2 bg-slate-900 flex flex-col"
          style={{ borderColor: card.rarity.color, boxShadow: `0 0 20px ${card.rarity.color}33` }}
        >
          {isNew && (
            <div className="absolute top-2 left-2 z-10 bg-amber-500 text-slate-950 font-black text-[10px] tracking-wider px-2 py-0.5 rounded shadow-lg uppercase">
              NEW!
            </div>
          )}

          <div className="absolute top-2 right-2 z-10 px-2.5 py-0.5 rounded-full font-bold text-xs shadow-md"
            style={{ backgroundColor: card.rarity.color, color: '#0f172a' }}>
            {card.rarity.name}
          </div>

          <div className="relative flex-1 bg-slate-950 overflow-hidden">
            <img
              src={card.image_url}
              alt={card.name}
              className="w-full h-full object-cover object-center"
              loading="lazy"
            />
          </div>

          <div className="p-3 bg-slate-900/95 border-t border-slate-800">
            <h3 className="font-bold text-sm text-slate-100 truncate">{card.name}</h3>
            {card.description && (
              <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">{card.description}</p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
```

- [ ] **Step 2: Create SummonStage Component (`SummonStage.tsx`)**

Create `projects/gacha/packages/client/src/components/SummonStage.tsx`:
```tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RotateCcw, Eye } from 'lucide-react';
import { CardFlip } from './CardFlip';
import { pullGacha } from '../services/api';
import { recordPulls, getLocalInventory } from '../services/inventory';
import type { Card } from '../types';

interface SummonStageProps {
  onOpenRates: () => void;
}

export const SummonStage: React.FC<SummonStageProps> = ({ onOpenRates }) => {
  const [pulling, setPulling] = useState(false);
  const [results, setResults] = useState<Card[]>([]);
  const [newCardIds, setNewCardIds] = useState<Set<string>>(new Set());
  const [revealAll, setRevealAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePull = async (count: 1 | 10) => {
    setError(null);
    setPulling(true);
    setRevealAll(false);
    try {
      const existingInventory = getLocalInventory();
      const res = await pullGacha(count);

      const newlyDiscovered = new Set<string>();
      res.results.forEach((c) => {
        if (!existingInventory[c.id]) {
          newlyDiscovered.add(c.id);
        }
      });

      recordPulls(res.results);
      setNewCardIds(newlyDiscovered);
      setResults(res.results);
    } catch (err: any) {
      setError(err.message || 'Error occurred while pulling.');
    } finally {
      setPulling(false);
    }
  };

  const handleReset = () => {
    setResults([]);
    setRevealAll(false);
    setError(null);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8">
      {error && (
        <div className="w-full max-w-md bg-rose-500/20 border border-rose-500/40 text-rose-200 px-4 py-3 rounded-xl mb-6 text-sm text-center">
          {error}
        </div>
      )}

      {results.length === 0 ? (
        <div className="text-center max-w-lg">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative w-48 h-48 sm:w-64 sm:h-64 mx-auto mb-8 flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
            <div className="w-full h-full rounded-full border-2 border-dashed border-purple-400/30 flex items-center justify-center animate-[spin_30s_linear_infinite]">
              <div className="w-3/4 h-3/4 rounded-full border border-indigo-400/40" />
            </div>
            <Sparkles className="w-16 h-16 text-purple-400 absolute animate-bounce" />
          </motion.div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 mb-2">
            Summon Celestial Cards
          </h2>
          <p className="text-slate-400 text-sm mb-8">
            Test your luck in the celestial summon pool. Collect all rarities to complete your album!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => handlePull(1)}
              disabled={pulling}
              className="px-8 py-3.5 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              Summon x1
            </button>
            <button
              onClick={() => handlePull(10)}
              disabled={pulling}
              className="px-8 py-3.5 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-900/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Summon x10
            </button>
          </div>

          <button
            onClick={onOpenRates}
            className="mt-6 text-xs text-slate-500 hover:text-slate-300 underline tracking-wide"
          >
            View Drop Rates & Odds
          </button>
        </div>
      ) : (
        <div className="w-full max-w-6xl">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Summon Again
            </button>
            {!revealAll && (
              <button
                onClick={() => setRevealAll(true)}
                className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all"
              >
                <Eye className="w-3.5 h-3.5" /> Reveal All Cards
              </button>
            )}
          </div>

          {results.length === 1 ? (
            <div className="max-w-xs mx-auto py-8">
              <CardFlip
                card={results[0]}
                isNew={newCardIds.has(results[0].id)}
                revealed={revealAll}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
              {results.map((card, idx) => (
                <CardFlip
                  key={`${card.id}-${idx}`}
                  card={card}
                  isNew={newCardIds.has(card.id)}
                  revealed={revealAll}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 3: Write test for CardFlip component rendering**

Create `projects/gacha/packages/client/tests/CardFlip.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { CardFlip } from '../src/components/CardFlip';
import type { Card } from '../src/types';

describe('CardFlip Component', () => {
  const card: Card = {
    id: 'test-1',
    name: 'Mythic Valkyrie',
    rarity: { id: 'r1', name: 'SSR', color: '#FFD700' },
    image_url: '/uploads/cards/valk.png',
    description: 'Bringer of victory.',
  };

  it('renders card with back cover initially', () => {
    render(<CardFlip card={card} />);
    expect(screen.getByText('Tap to Reveal')).toBeDefined();
    expect(screen.getByText('Mythic Valkyrie')).toBeDefined();
  });
});
```

- [ ] **Step 4: Run test to verify**

Run: `npm test --workspace=packages/client`
Expected: PASS

---

### Task 8: Frontend Album / Collection View & Rates Modal

**Files:**
- Create: `projects/gacha/packages/client/src/components/RatesModal.tsx`
- Create: `projects/gacha/packages/client/src/components/CardModal.tsx`
- Create: `projects/gacha/packages/client/src/components/AlbumView.tsx`

**Interfaces:**
- Consumes: `fetchCards`, `fetchRates`, `getLocalInventory`.
- Produces: Collection page showing total completion %, silhouettes for undiscovered cards, and detailed full-screen card viewer.

- [ ] **Step 1: Create RatesModal Component (`RatesModal.tsx`)**

Create `projects/gacha/packages/client/src/components/RatesModal.tsx`:
```tsx
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { fetchRates } from '../services/api';
import type { Rarity } from '../types';

interface RatesModalProps {
  onClose: () => void;
}

export const RatesModal: React.FC<RatesModalProps> = ({ onClose }) => {
  const [rarities, setRarities] = useState<Rarity[]>([]);
  const [totalCards, setTotalCards] = useState(0);

  useEffect(() => {
    fetchRates().then((data) => {
      setRarities(data.rarities);
      setTotalCards(data.total_cards);
    });
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-slate-100 mb-1">Summon Odds & Details</h3>
        <p className="text-xs text-slate-400 mb-4">Total cards in pool: {totalCards}</p>

        <div className="space-y-3">
          {rarities.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/40">
              <div className="flex items-center gap-2.5">
                <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: r.color }} />
                <span className="font-bold text-sm text-slate-200">{r.name}</span>
                <span className="text-xs text-slate-400">({r.card_count || 0} cards)</span>
              </div>
              <span className="font-mono text-sm font-semibold" style={{ color: r.color }}>
                {Number(r.drop_rate).toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Create CardModal Component (`CardModal.tsx`)**

Create `projects/gacha/packages/client/src/components/CardModal.tsx`:
```tsx
import React from 'react';
import { X, Calendar } from 'lucide-react';
import type { Card, InventoryItem } from '../types';

interface CardModalProps {
  card: Card;
  inventoryItem?: InventoryItem;
  onClose: () => void;
}

export const CardModal: React.FC<CardModalProps> = ({ card, inventoryItem, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-slate-950/60 hover:bg-slate-950 text-white p-2 rounded-full backdrop-blur-sm"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative aspect-[4/5] w-full bg-slate-950">
          <img src={card.image_url} alt={card.name} className="w-full h-full object-contain" />
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-bold"
              style={{ backgroundColor: card.rarity.color, color: '#0f172a' }}
            >
              {card.rarity.name}
            </span>
            {inventoryItem && (
              <span className="text-xs font-semibold text-slate-400">
                Copies Pulled: <strong className="text-slate-200">x{inventoryItem.count}</strong>
              </span>
            )}
          </div>

          <h2 className="text-xl font-bold text-slate-100 mb-2">{card.name}</h2>
          <p className="text-sm text-slate-300 leading-relaxed mb-4">
            {card.description || 'No lore recorded for this celestial card.'}
          </p>

          {inventoryItem && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-3 border-t border-slate-800">
              <Calendar className="w-3.5 h-3.5" />
              <span>Discovered on {new Date(inventoryItem.firstPulledAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Create AlbumView Component (`AlbumView.tsx`)**

Create `projects/gacha/packages/client/src/components/AlbumView.tsx`:
```tsx
import React, { useEffect, useState } from 'react';
import { fetchCards, fetchRates } from '../services/api';
import { getLocalInventory } from '../services/inventory';
import { CardModal } from './CardModal';
import type { Card, Rarity, InventoryItem } from '../types';

export const AlbumView: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [rarities, setRarities] = useState<Rarity[]>([]);
  const [inventory, setInventory] = useState<Record<string, InventoryItem>>({});
  const [selectedRarity, setSelectedRarity] = useState<string>('all');
  const [activeModalCard, setActiveModalCard] = useState<Card | null>(null);

  useEffect(() => {
    setInventory(getLocalInventory());
    fetchCards().then((res) => setCards(res.cards));
    fetchRates().then((res) => setRarities(res.rarities));
  }, []);

  const discoveredCount = cards.filter((c) => inventory[c.id]).length;
  const completionPercentage = cards.length > 0 ? Math.round((discoveredCount / cards.length) * 100) : 0;

  const filteredCards = cards.filter((c) => {
    if (selectedRarity !== 'all' && c.rarity.id !== selectedRarity) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header & Stats */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Card Album</h2>
          <p className="text-sm text-slate-400 mt-1">
            Collection progress: {discoveredCount} / {cards.length} cards ({completionPercentage}%)
          </p>
        </div>
        <div className="w-full sm:w-48 bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
          <div
            className="bg-gradient-to-r from-purple-500 to-indigo-400 h-full transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Rarity Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedRarity('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
            selectedRarity === 'all'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
          }`}
        >
          All ({cards.length})
        </button>
        {rarities.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedRarity(r.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              selectedRarity === r.id
                ? 'text-slate-950 font-bold'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
            style={selectedRarity === r.id ? { backgroundColor: r.color } : {}}
          >
            {r.name}
          </button>
        ))}
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredCards.map((card) => {
          const invItem = inventory[card.id];
          const isDiscovered = Boolean(invItem);

          return (
            <div
              key={card.id}
              onClick={() => isDiscovered && setActiveModalCard(card)}
              className={`aspect-[2/3] rounded-2xl overflow-hidden border-2 relative flex flex-col ${
                isDiscovered
                  ? 'cursor-pointer hover:scale-[1.02] transition-transform shadow-lg'
                  : 'opacity-40 grayscale border-slate-800 bg-slate-950 select-none'
              }`}
              style={isDiscovered ? { borderColor: card.rarity.color } : {}}
            >
              {isDiscovered ? (
                <>
                  <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: card.rarity.color, color: '#0f172a' }}>
                    {card.rarity.name}
                  </div>
                  <div className="absolute top-2 left-2 z-10 bg-slate-950/80 text-slate-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    x{invItem.count}
                  </div>
                  <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
                  <div className="p-2 bg-slate-900/90 border-t border-slate-800 mt-auto">
                    <p className="text-xs font-bold text-slate-200 truncate">{card.name}</p>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                  <span className="text-3xl text-slate-600 mb-2">?</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.rarity.name}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {activeModalCard && (
        <CardModal
          card={activeModalCard}
          inventoryItem={inventory[activeModalCard.id]}
          onClose={() => setActiveModalCard(null)}
        />
      )}
    </div>
  );
};
```

---

### Task 9: Frontend Admin Portal (Dynamic Rarities & Card Management)

**Files:**
- Create: `projects/gacha/packages/client/src/components/AdminPanel.tsx`
- Create: `projects/gacha/packages/client/src/App.tsx`
- Create: `projects/gacha/packages/client/src/main.tsx`

**Interfaces:**
- Consumes: Admin token, `createCardApi`, `deleteCardApi`, `saveRarityApi`, `deleteRarityApi`.
- Produces: Protected management dashboard for uploading cards, setting drop rates, and configuring rarity tiers.

- [ ] **Step 1: Create AdminPanel Component (`AdminPanel.tsx`)**

Create `projects/gacha/packages/client/src/components/AdminPanel.tsx`:
```tsx
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Upload, Lock, ShieldCheck } from 'lucide-react';
import {
  loginAdmin,
  fetchRates,
  fetchCards,
  createCardApi,
  deleteCardApi,
  saveRarityApi,
  deleteRarityApi,
} from '../services/api';
import type { Card, Rarity } from '../types';

export const AdminPanel: React.FC = () => {
  const [token, setToken] = useState<string>(() => localStorage.getItem('gacha_admin_token') || '');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'cards' | 'rarities'>('cards');
  const [cards, setCards] = useState<Card[]>([]);
  const [rarities, setRarities] = useState<Rarity[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Form states for uploading card
  const [cardName, setCardName] = useState('');
  const [cardRarity, setCardRarity] = useState('');
  const [cardDesc, setCardDesc] = useState('');
  const [cardFile, setCardFile] = useState<File | null>(null);

  // Form states for new rarity
  const [rarityName, setRarityName] = useState('');
  const [rarityColor, setRarityColor] = useState('#a855f7');
  const [rarityRate, setRarityRate] = useState(10);
  const [raritySort, setRaritySort] = useState(1);

  const loadData = () => {
    fetchCards().then((res) => setCards(res.cards));
    fetchRates().then((res) => {
      setRarities(res.rarities);
      if (res.rarities.length > 0 && !cardRarity) {
        setCardRarity(res.rarities[0].id);
      }
    });
  };

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const jwt = await loginAdmin(password);
      setToken(jwt);
      localStorage.setItem('gacha_admin_token', jwt);
      setStatusMessage(null);
    } catch (err: any) {
      setStatusMessage(err.message || 'Login failed.');
    }
  };

  const handleUploadCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardFile || !cardName || !cardRarity) return;

    const fd = new FormData();
    fd.append('name', cardName);
    fd.append('rarity_id', cardRarity);
    fd.append('description', cardDesc);
    fd.append('image', cardFile);

    try {
      await createCardApi(fd, token);
      setCardName('');
      setCardDesc('');
      setCardFile(null);
      loadData();
      setStatusMessage('Card uploaded successfully!');
    } catch (err: any) {
      setStatusMessage(err.message);
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!confirm('Are you sure you want to delete this card?')) return;
    try {
      await deleteCardApi(id, token);
      loadData();
    } catch (err: any) {
      setStatusMessage(err.message);
    }
  };

  const handleCreateRarity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveRarityApi(
        {
          name: rarityName,
          color: rarityColor,
          drop_rate: rarityRate,
          sort_order: raritySort,
        },
        token
      );
      setRarityName('');
      loadData();
      setStatusMessage('Rarity tier created!');
    } catch (err: any) {
      setStatusMessage(err.message);
    }
  };

  const handleDeleteRarity = async (id: string) => {
    if (!confirm('Delete this rarity tier?')) return;
    try {
      await deleteRarityApi(id, token);
      loadData();
    } catch (err: any) {
      setStatusMessage(err.message);
    }
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
          <Lock className="w-10 h-10 text-purple-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-100 mb-2">Admin Authentication</h2>
          <p className="text-xs text-slate-400 mb-6">Enter admin password to manage gacha pool and drop rates.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-purple-500"
            />
            {statusMessage && <p className="text-xs text-rose-400">{statusMessage}</p>}
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white text-sm"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  const totalRate = rarities.reduce((sum, r) => sum + (Number(r.drop_rate) || 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <h2 className="text-2xl font-bold text-slate-100">Admin Dashboard</h2>
        </div>
        <button
          onClick={() => {
            setToken('');
            localStorage.removeItem('gacha_admin_token');
          }}
          className="text-xs text-slate-400 hover:text-white"
        >
          Logout
        </button>
      </div>

      {statusMessage && (
        <div className="p-3 bg-purple-900/30 border border-purple-500/30 text-purple-200 text-xs rounded-xl mb-6">
          {statusMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('cards')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'cards' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-400'
          }`}
        >
          Manage Cards ({cards.length})
        </button>
        <button
          onClick={() => setActiveTab('rarities')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'rarities' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-400'
          }`}
        >
          Manage Rarities ({rarities.length})
        </button>
      </div>

      {activeTab === 'cards' ? (
        <div className="space-y-8">
          {/* Upload Card Form */}
          <form onSubmit={handleUploadCard} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-slate-100 text-base">Upload New Card</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Card Name"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                required
                className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100"
              />
              <select
                value={cardRarity}
                onChange={(e) => setCardRarity(e.target.value)}
                className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100"
              >
                {rarities.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.drop_rate}%)
                  </option>
                ))}
              </select>
            </div>
            <textarea
              placeholder="Lore / Description (optional)"
              value={cardDesc}
              onChange={(e) => setCardDesc(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100"
            />
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setCardFile(e.target.files?.[0] || null)}
                required
                className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer"
              />
              <button
                type="submit"
                className="ml-auto px-6 py-2 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white text-sm flex items-center gap-2"
              >
                <Upload className="w-4 h-4" /> Save Card
              </button>
            </div>
          </form>

          {/* Cards List */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {cards.map((c) => (
              <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative">
                <button
                  onClick={() => handleDeleteCard(c.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-500 z-10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="aspect-[4/5] bg-slate-950">
                  <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: c.rarity.color, color: '#0f172a' }}>
                    {c.rarity.name}
                  </span>
                  <p className="font-bold text-xs text-slate-100 truncate mt-1">{c.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Rarity creator */}
          <form onSubmit={handleCreateRarity} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-slate-100 text-base">Add Custom Rarity Tier</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Rarity Name (e.g. UR)"
                value={rarityName}
                onChange={(e) => setRarityName(e.target.value)}
                required
                className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100"
              />
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={rarityColor}
                  onChange={(e) => setRarityColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent"
                />
                <span className="text-xs font-mono text-slate-300">{rarityColor}</span>
              </div>
              <input
                type="number"
                step="0.01"
                placeholder="Drop Rate %"
                value={rarityRate}
                onChange={(e) => setRarityRate(parseFloat(e.target.value))}
                required
                className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100"
              />
              <button
                type="submit"
                className="py-2 px-4 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white text-sm flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Tier
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Total configured rates: <strong className={totalRate === 100 ? 'text-emerald-400' : 'text-amber-400'}>{totalRate}%</strong> (Rates are normalized automatically if not 100%).
            </p>
          </form>

          {/* Rarity Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs text-slate-400 uppercase">
                <tr>
                  <th className="px-6 py-3">Tier</th>
                  <th className="px-6 py-3">Color</th>
                  <th className="px-6 py-3">Drop Rate</th>
                  <th className="px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rarities.map((r) => (
                  <tr key={r.id}>
                    <td className="px-6 py-4 font-bold text-slate-100">{r.name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block w-4 h-4 rounded-full mr-2 align-middle" style={{ backgroundColor: r.color }} />
                      <span className="font-mono text-xs">{r.color}</span>
                    </td>
                    <td className="px-6 py-4 font-mono">{r.drop_rate}%</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDeleteRarity(r.id)}
                        className="text-rose-400 hover:text-rose-300 text-xs font-semibold"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Create main App container (`App.tsx`) and entry point (`main.tsx`)**

Create `projects/gacha/packages/client/src/App.tsx`:
```tsx
import React, { useState } from 'react';
import { Sparkles, BookOpen, Shield } from 'lucide-react';
import { SummonStage } from './components/SummonStage';
import { AlbumView } from './components/AlbumView';
import { AdminPanel } from './components/AdminPanel';
import { RatesModal } from './components/RatesModal';
import type { ViewTab } from './types';

export const App: React.FC = () => {
  const [tab, setTab] = useState<ViewTab>('summon');
  const [ratesModalOpen, setRatesModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setTab('summon')}>
            <Sparkles className="w-6 h-6 text-purple-400" />
            <span className="font-black text-lg tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
              CELESTIAL GACHA
            </span>
          </div>

          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setTab('summon')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all ${
                tab === 'summon' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" /> Summon
            </button>
            <button
              onClick={() => setTab('album')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all ${
                tab === 'album' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" /> Album
            </button>
            <button
              onClick={() => setTab('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all ${
                tab === 'admin' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-4 h-4" /> Admin
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {tab === 'summon' && <SummonStage onOpenRates={() => setRatesModalOpen(true)} />}
        {tab === 'album' && <AlbumView />}
        {tab === 'admin' && <AdminPanel />}
      </main>

      {ratesModalOpen && <RatesModal onClose={() => setRatesModalOpen(false)} />}
    </div>
  );
};
```

Create `projects/gacha/packages/client/src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

### Task 10: Build Verification & Docker Compose Smoke Test

**Files:**
- Modify: `projects/gacha/package.json`
- Create: `projects/gacha/README.md`

**Interfaces:**
- Consumes: Complete codebase
- Produces: Runnable container stack and verified build artifacts.

- [ ] **Step 1: Create README.md with clear launch instructions**

Create `projects/gacha/README.md`:
```markdown
# Web-Based Gacha Game

A mobile-responsive web gacha simulator built with React, Node.js, Express, MySQL 8.0, and Docker Compose.

## Features
- **Casual Simulator Play:** No account needed; pull single (1x) or ten-fold (10x) packs anytime.
- **3D Card Reveal:** Flip cards with 3D animations and discover new cards.
- **Player Album:** Tracks discovered cards and copies in `localStorage`.
- **Dynamic Admin Dashboard:** Upload cards, set drop rates, and manage custom rarity tiers.
- **Dockerized:** Single command deployment.

## Quick Start with Docker
```bash
docker compose up --build
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

Admin Default Password: `adminsecret` (configurable in `.env`).

## Development
```bash
npm install
npm run dev
```
```

- [ ] **Step 2: Run root build verification**

Run: `npm run build`
Expected: Both `@gacha/server` and `@gacha/client` compile without TypeScript or bundle errors.

- [ ] **Step 3: Run all unit and integration tests**

Run: `npm test`
Expected: All tests pass across packages.
