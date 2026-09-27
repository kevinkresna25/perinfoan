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
