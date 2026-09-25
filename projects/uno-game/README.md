# 🎴 Perinfoan UNO Game

> Multiplayer web-based UNO card game built for the Perinfoan circle.

---

## 📌 Features

- **Private Rooms**: Instant 6-letter room codes & shareable invite links (`?room=XXXXXX`).
- **Official Classic UNO Rules**: Complete 108 cards (Numbers 0–9, Skip, Reverse, Draw 2, Wild, Wild Draw 4), "Call UNO!" button, and catch penalty.
- **Cheat-Resistant Server**: Authoritative Node.js + Socket.io backend that masks opponent cards from network payloads.
- **Optional Custom Card Art**: Room host can upload custom artwork (PNG/JPG/WebP &lt; 2MB) for card backs, wild cards, and action cards.
- **Responsive Table UI**: Mobile & desktop friendly built with React 18, Vite, Tailwind CSS, Framer Motion, and Web Audio API synthesized sound effects.
- **Ultra-Lightweight Footprint**: Single multi-stage Docker container (~50–70MB RAM) on `perinfoan-net`.

---

## 📂 Architecture

```text
projects/uno-game/
├── Dockerfile                  # Multi-stage build (compiles client + runs server)
├── docker-compose.yml          # Container configuration on `perinfoan-net`
└── packages/
    ├── shared/                 # Pure TypeScript rule engine, types & 108-card deck
    ├── server/                 # Node.js + Express + Socket.io + Multer uploads
    └── client/                 # React 18 + Vite + Tailwind CSS + Framer Motion
```

---

## 🚀 Local Development

### 1. Install dependencies
```bash
npm install
```

### 2. Run in development mode
In separate terminal tabs:
```bash
# Start backend server
npm run dev --workspace=packages/server

# Start frontend dev server
npm run dev --workspace=packages/client
```

Open `http://localhost:5173` in your browser.

### 3. Run Test Suites
```bash
npm test
```

---

## 🐳 Docker Deployment

```bash
# Ensure shared network exists
docker network create perinfoan-net || true

# Build & launch container
docker compose up -d --build
```
The game will be available at `http://localhost:3000` and routable through Cloudflare Zero Trust Tunnel.
