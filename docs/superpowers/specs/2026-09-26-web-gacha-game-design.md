# Web-Based Gacha Game Design Specification

**Date:** 2026-09-26  
**Status:** Draft / Approved Design  
**Target Path:** `projects/gacha`  
**Primary Users:** Players (casual simulation, pulling cards, completing album) & Admins (card & rarity management)

---

## 1. Executive Summary

This project implements a web-based, casual gacha simulator game containerized with Docker Compose. The application features a server-authoritative weighted RNG roll engine, dynamic rarity tier configuration, persistent local card image storage (object storage pattern), and an interactive, mobile-responsive single-page application built with React, Tailwind CSS, and Framer Motion.

The system requires only a single command to run:
```bash
docker compose up --build
```
This provisions a MySQL 8.0 database, initializes schema and starter rarities, compiles the frontend client, and serves both the REST API and the web application via Express on port 3000.

---

## 2. Roles & Permissions

1. **Player (Public / Casual)**
   - No login or sign-up required.
   - Can perform single (1x) or ten-fold (10x) summons.
   - Views transparent drop rate details and odds breakdown per rarity.
   - Discovered cards and duplicate pull counts are automatically tracked in the browser's `localStorage` (`gacha_inventory`).
   - Can browse the Card Album / Collection with filters (by rarity, discovery status) and click cards for full artwork and lore inspection.

2. **Admin (Protected)**
   - Authenticated via session/JWT token verified against an environment-configured secret (`ADMIN_PASSWORD` default in `.env`).
   - Dynamic Rarity Management: Create, update (name, color badge, drop rate %, sort order), and delete rarity tiers.
   - Card Management: Upload new cards with multipart image files, title, rarity assignment, and description; view card catalog; delete cards (safely cleaning up physical image files and database entries).

---

## 3. System Architecture & Tech Stack

```
                        +---------------------------------------+
                        |         Browser (Desktop & Mobile)     |
                        |   React 18 + Vite + Tailwind + Motion  |
                        +-------------------+-------------------+
                                            |
                         HTTP / REST API    | Static SPA & Card Images
                         & Multipart Upload |
                                            v
                        +---------------------------------------+
                        |      Node.js Express Application      |
                        |             (Port 3000)               |
                        +---------+-------------------+---------+
                                  |                   |
            Multer / FS Streams   |                   | SQL Queries (mysql2/promise)
                                  v                   v
            +---------------------------+   +---------------------------+
            |  Local Storage Directory  |   |    MySQL 8.0 Database     |
            |   (storage/uploads/cards) |   |        (Port 3306)        |
            |     [Persistent Volume]   |   |    [Persistent Volume]    |
            +---------------------------+   +---------------------------+
```

### 3.1 Backend
- **Runtime:** Node.js (v20+ LTS) with TypeScript (`tsx` for dev, `tsc` for production build).
- **Framework:** Express 4.x.
- **Database Access:** `mysql2/promise` with connection pooling and parameter binding to prevent SQL injection.
- **File Uploads:** `multer` with file filtering (MIME validation: `image/png`, `image/jpeg`, `image/webp`, `image/gif`) and UUID-based file naming.
- **Static Delivery:** Express serves both the production React bundle and uploaded images (`/uploads/cards/*`) with appropriate cache headers.

### 3.2 Frontend
- **Framework:** React 18 + Vite + TypeScript.
- **Styling & Icons:** Tailwind CSS with Lucide Icons.
- **Animations:** Framer Motion for suspenseful card flip 3D transitions, shimmer glows, and reveal sequences.
- **Storage:** Client `localStorage` for player collection data, pull history stats, and audio toggle preferences.
- **Responsiveness:** Fluid mobile-first grid layouts supporting phones (360px+), tablets, and desktop displays.

### 3.3 Containerization
- **Database Service (`mysql`):** Official `mysql:8.0` container with auto-running `/docker-entrypoint-initdb.d/init.sql` schema migration and health checks.
- **App Service (`app`):** Multi-stage Dockerfile that installs dependencies, builds the client Vite bundle, compiles TypeScript server files, and runs Node in production mode.
- **Named Docker Volumes:**
  - `gacha_mysql_data` $\rightarrow$ `/var/lib/mysql`
  - `gacha_card_uploads` $\rightarrow$ `/app/storage/uploads/cards`

---

## 4. Data Model & Database Schema

### 4.1 Schema Definitions (`init.sql`)

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

-- Seed initial starter rarities
INSERT IGNORE INTO rarities (id, name, color, drop_rate, sort_order) VALUES
  ('rarity-ssr', 'SSR', '#FFD700', 3.00, 3),
  ('rarity-sr',  'SR',  '#A855F7', 15.00, 2),
  ('rarity-r',   'R',   '#3B82F6', 32.00, 1),
  ('rarity-n',   'N',   '#9CA3AF', 50.00, 0);
```

---

## 5. Gacha Roll Algorithm & Mechanics

### 5.1 Two-Stage Weighted Random Selection
1. **Rarity Selection:**
   - Active rarities are loaded with their configured `drop_rate` values.
   - Sum of configured rates $S = \sum drop\_rate$.
   - A random float $r \in [0, 100)$ is generated using crypto-secure or uniform PRNG.
   - Rarity brackets are evaluated cumulatively. If total rates do not sum to 100%, rates are normalized to $100\%$ ($p_i' = \frac{p_i}{S} \times 100$) so probabilities always remain mathematically sound.
2. **Card Selection:**
   - Cards matching the selected rarity tier are retrieved from cache/database.
   - If cards exist in this tier, pick one card uniformly with probability $1 / N_{tier}$.
   - **Fallback Mechanism:** If an admin created a rarity tier but has not yet uploaded any cards for it, the algorithm automatically drops down to the highest available tier that contains at least one card.
   - If no cards exist in the entire system, the API responds with an informative `400 Bad Request` ("Gacha pool is empty. Please contact admin to add cards.").

### 5.2 Pull Modes
- **Single Pull (`count = 1`):** Generates 1 card.
- **Ten-fold Pull (`count = 10`):** Generates 10 cards. Includes a "pity guarantee" feature toggle: at least 1 pull in a 10-pack is guaranteed to be tier with `sort_order >= 1` (e.g. R or better).

---

## 6. API Specification

### 6.1 Public Player Endpoints

#### `GET /api/gacha/rates`
- **Response:**
  ```json
  {
    "rarities": [
      {
        "id": "rarity-ssr",
        "name": "SSR",
        "color": "#FFD700",
        "drop_rate": 3.0,
        "card_count": 5
      }
    ],
    "total_cards": 24
  }
  ```

#### `POST /api/gacha/pull`
- **Request Body:** `{ "count": 1 | 10 }`
- **Response:**
  ```json
  {
    "results": [
      {
        "id": "uuid-card-1",
        "name": "Celestial Phoenix",
        "rarity": {
          "id": "rarity-ssr",
          "name": "SSR",
          "color": "#FFD700"
        },
        "image_url": "/uploads/cards/uuid-card-1.png",
        "description": "A legendary bird reborn from cosmic flames."
      }
    ]
  }
  ```

#### `GET /api/cards`
- **Query Params:** `?rarity_id=...` (optional)
- **Response:** List of all cards available in the pool (for gallery album silhouettes and discovery check).

### 6.2 Admin Endpoints (Require `Authorization: Bearer <token>` or `x-admin-token`)

#### `POST /api/admin/login`
- **Request Body:** `{ "password": "string" }`
- **Response:** `{ "token": "jwt-or-session-token", "expires_in": "24h" }`

#### `GET /api/admin/rarities` & `POST /api/admin/rarities`
- Create or list rarity tiers (`name`, `color`, `drop_rate`, `sort_order`).

#### `PUT /api/admin/rarities/:id` & `DELETE /api/admin/rarities/:id`
- Edit rarity properties or delete empty rarity tiers.

#### `POST /api/admin/cards`
- **Content-Type:** `multipart/form-data`
- **Fields:** `name` (string), `rarity_id` (string), `description` (string), `image` (file binary).
- **Processing:** Validates image file type and size ($\le 10\text{ MB}$), saves to `storage/uploads/cards/<uuid>.<ext>`, inserts card record into MySQL.

#### `DELETE /api/admin/cards/:id`
- Deletes card from MySQL and synchronously unlinks image from disk storage.

---

## 7. Frontend User Experience & Components

### 7.1 View Navigation
- **Header:**
  - Game Title / Logo with glowing neon banner styling.
  - Tabs: **Summon**, **Album**, **Rates & Info**.
  - Right action: Admin Lock icon (opens login modal $\rightarrow$ admin drawer/page).

### 7.2 Summon Stage (`SummonView`)
- Animated banner pedestal with visual effects.
- Big buttons: **"Summon x1"** and **"Summon x10"**.
- Pack Opening Sequence:
  - Suspense charging animation (glow pulse matches highest rarity pulled).
  - Reveal screen:
    - 1x pull: Centered 3D flip card, click or tap to flip face-up with sound/sparkle effect.
    - 10x pull: 5x2 grid (desktop) or 2-column swipeable cards (mobile). "Reveal All" quick button or tap card-by-card.
    - Badges: Animated "NEW!" badge if card was not previously discovered in `localStorage`.
    - "Summon Again" action button.

### 7.3 Album & Collection View (`AlbumView`)
- Completion Header: e.g. "Collection: 18 / 25 Cards (72%)".
- Filter bar: All, SSR, SR, R, N, or filter by "Discovered Only".
- Grid of cards:
  - Undiscovered cards shown as mystery dark silhouettes with a question mark and rarity color outline.
  - Discovered cards show artwork, rarity badge, card name, and duplicate count badge (`x4`).
  - Card Detail Modal: Clicking any discovered card displays full-screen high-definition artwork, lore text, and discovery date.

### 7.4 Admin Management Portal (`AdminView`)
- Protected view: Prompts for admin password if unauthenticated.
- **Rarity Manager Tab:**
  - Table of tiers with drag or sort order, color badge preview, and percentage inputs.
  - Real-time indicator showing if total sum equals 100% or warning of weight normalization.
- **Card Catalog Tab:**
  - Upload Card button opening a clean modal: Name, Rarity dropdown, description, drag-and-drop file upload with preview.
  - Card list with instant search and delete button (with confirmation).

---

## 8. Error Handling & Edge Cases

1. **Empty Card Pool:**
   - If player attempts to summon when no cards have been uploaded yet, server returns user-friendly error `NO_CARDS_IN_POOL`. UI displays a friendly empty state guiding the user to upload cards via the admin panel.
2. **Missing Files on Disk:**
   - If an image file is unexpectedly missing from disk, Express serves a fallback SVG card placeholder instead of a broken 404 image.
3. **Database Reconnection:**
   - MySQL connection pool configured with reconnect listeners, auto-retry on server boot, and graceful startup waits.
4. **Invalid Image Formats / Oversized Files:**
   - Multer middleware strictly rejects non-image formats and enforces a 10MB file limit with clear client-side toast notifications.

---

## 9. Testing Strategy

1. **Unit Tests:**
   - Gacha Engine RNG tests: Verify probability distribution over $10,000$ iterations matches configured drop rates within statistical confidence intervals.
   - Fallback tests: Verify behavior when rarity tiers are empty.
2. **Integration / API Tests:**
   - Supertest suite for API endpoints: card upload, rarity creation, pull execution, authentication barriers.
3. **Frontend Component Tests:**
   - Vitest + Testing Library for card flip interaction, local storage inventory updates, and responsive layout tests.
