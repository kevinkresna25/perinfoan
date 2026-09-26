# Technical Specification: Web-Based Multiplayer UNO Game

- **Date**: 2026-09-24
- **Project Location**: `projects/uno-game/`
- **Target Platform**: Web (Mobile & Desktop browsers), Docker on private VPS (`perinfoan-net`), Cloudflare Zero Trust Tunnel
- **Status**: Draft / Awaiting Review

---

## 1. Overview & Objectives

The goal of this project is to build an engaging, web-based, real-time multiplayer UNO card game tailored for the **Perinfoan** circle and friends. Players can create private game rooms, share 6-character room codes or join links, and play together on desktop or mobile devices with responsive animations, sound effects, and zero client installation.

### Key Objectives
1. **Frictionless Circle Play**: Instant room creation, shareable invite links, and low-latency real-time multiplayer for 2 to 8 players.
2. **Official Classic UNO Rules**: Complete 108-card deck implementation with authoritative rule validation, action cards (Skip, Reverse, Draw 2, Wild, Wild Draw 4), turn timers, and "Call UNO!" / "Catch UNO!" mechanics.
3. **Optional Custom Card Art**: Room hosts can optionally upload custom images (e.g. circle avatars, memes, custom themes) applied across cards in the room.
4. **Authoritative Cheat-Resistant Server**: Server holds the deck and masks hidden cards; clients never receive opponent hands over the wire.
5. **Lightweight Deployment**: Single Docker container (~50–70MB RAM) integrating seamlessly into the existing Perinfoan decoupled multi-project infrastructure.

---

## 2. Operating Context & Platform Constraints

- **Repository**: Decoupled multi-project structure under `projects/uno-game/`.
- **Infrastructure**: Self-hosted on VPS running Docker Engine.
- **Networking**: Attached to the existing `perinfoan-net` external Docker bridge network.
- **Ingress**: Exposed securely via Cloudflare Zero Trust Tunnel (`cloudflared`) to a designated subdomain (e.g. `uno.perinfoan.com`), with no exposed public host ports.
- **Storage & State**: In-memory room store with automatic expiration (no database needed for v1). Optional uploaded images stored in a transient `./uploads` directory tied to room lifecycles.

---

## 3. System Architecture & Directory Structure

The project uses a monorepo workspace containing three packages: `shared`, `server`, and `client`.

```text
projects/uno-game/
├── package.json                   # Workspace root (npm/pnpm workspaces)
├── tsconfig.base.json             # Base TypeScript configuration
├── Dockerfile                     # Multi-stage production build (builds client & runs server)
├── docker-compose.yml             # Container definition on `perinfoan-net`
├── README.md                      # Setup and usage guide
│
├── packages/
│   ├── shared/                    # Pure TypeScript domain logic & types (Zero external dependencies)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── types/
│   │       │   ├── card.ts        # Card, CardColor, CardType definitions
│   │       │   ├── player.ts      # Player and connection state models
│   │       │   ├── room.ts        # Room configuration, status, and metadata
│   │       │   └── events.ts      # Socket.io client-server event contracts
│   │       ├── engine/
│   │       │   ├── deck.ts        # 108-card deck generator and Fisher-Yates shuffler
│   │       │   ├── rules.ts       # Pure rule validators (canPlayCard, isActionCard)
│   │       │   └── reducer.ts     # Authoritative state transitions (applyAction)
│   │       └── constants.ts       # Game timing, timeouts, card point values
│   │
│   ├── server/                    # Node.js + Express + Socket.io
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts           # HTTP server and Socket.io gateway initialization
│   │       ├── config.ts          # Environment variables (PORT, CORS, UPLOAD_LIMITS)
│   │       ├── rooms/
│   │       │   ├── RoomManager.ts # In-memory room lifecycle and code generator
│   │       │   └── GameRoom.ts    # Individual room instance and timer coordinator
│   │       ├── sockets/
│   │       │   ├── handler.ts     # Main socket connection & routing logic
│   │       │   └── events/        # Handlers for room, lobby, and in-game actions
│   │       ├── routes/
│   │       │   └── uploads.ts     # Multer router for optional custom card images
│   │       └── utils/
│   │           └── stateMask.ts   # Strips opponent hand details before broadcast
│   │
│   └── client/                    # React 18+ + Vite + Tailwind CSS + Framer Motion
│       ├── package.json
│       ├── vite.config.ts
│       ├── tailwind.config.js
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── components/
│           │   ├── lobby/         # Room creation, code joiner, image uploader, player list
│           │   ├── game/
│           │   │   ├── Table.tsx          # Center discard & draw piles, direction indicator
│           │   │   ├── Hand.tsx           # Interactive fanned-out player hand
│           │   │   ├── OpponentBadge.tsx  # Remote player cards count & status
│           │   │   ├── ColorPicker.tsx    # Modal for choosing wild color
│           │   │   ├── UnoButton.tsx      # "Call UNO!" and "Catch UNO!" action triggers
│           │   │   └── TurnTimer.tsx      # Circular or bar countdown indicator
│           │   ├── card/
│           │   │   └── UnoCard.tsx        # Responsive SVG/CSS card renderer with custom image support
│           │   └── ui/            # Reusable button, modal, toast, and sound toggle components
│           ├── hooks/
│           │   ├── useSocket.ts   # Persistent Socket.io connection & session recovery
│           │   ├── useGameState.ts# Local synchronized game state store
│           │   └── useAudio.ts    # Web Audio API sound effect player
│           └── assets/            # Audio effects and static fallback illustrations
```

---

## 4. Domain Models & Authoritative Game Engine

### 4.1 Card Model (`packages/shared/src/types/card.ts`)

Standard 108 cards across 4 primary colors (`red`, `blue`, `green`, `yellow`) and special `wild` cards:
- **Number Cards (0–9)**: 76 cards (1x 0 per color, 2x 1–9 per color).
- **Action Cards**: 24 cards (2x `skip`, 2x `reverse`, 2x `draw2` per color).
- **Wild Cards**: 8 cards (4x `wild`, 4x `wild_draw4`).

```typescript
export type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';

export type CardType = 
  | 'number' 
  | 'skip' 
  | 'reverse' 
  | 'draw2' 
  | 'wild' 
  | 'wild_draw4';

export interface Card {
  id: string;               // e.g. "red-7-a", "wild-draw4-1"
  color: CardColor;
  type: CardType;
  value?: number;           // 0–9 for number cards
  customImageSlot?: string; // Optional identifier pointing to a custom asset
}
```

### 4.2 Game State (`packages/shared/src/types/room.ts`)

```typescript
export type RoomStatus = 'lobby' | 'playing' | 'ended';
export type Direction = 1 | -1; // 1 = clockwise, -1 = counter-clockwise

export interface Player {
  id: string;               // Persistent session ID
  socketId: string;         // Active socket connection ID
  name: string;             // Player display name
  isHost: boolean;
  cardsCount: number;       // Visible to all players
  hand?: Card[];            // PRIVATE: Populated ONLY for the player receiving their own state
  hasCalledUno: boolean;    // Flag indicating active UNO call when down to 1 card
  isConnected: boolean;
  lastActiveAt: number;
}

export interface ClientGameState {
  roomId: string;
  status: RoomStatus;
  players: Player[];
  activePlayerIndex: number;
  direction: Direction;
  topCard: Card;
  activeColor: CardColor;
  drawPileCount: number;
  turnTimeLimit: number;    // In seconds (e.g. 30s)
  turnRemainingSeconds: number;
  winnerId: string | null;
  customImages: Record<string, string>; // slot -> static asset URL
}
```

### 4.3 Move Validation & Action Resolution (`packages/shared/src/engine/`)

1. **Move Validity Rule**:
   A card may be played if:
   - `card.color === 'wild'` (Wild or Wild Draw 4 can be played on any card), OR
   - `card.color === activeColor`, OR
   - `card.type === topCard.type` (for action cards), OR
   - (`card.type === 'number'` && `topCard.type === 'number'` && `card.value === topCard.value`).

2. **Action Effects**:
   - **Skip**: Advances turn index by 2 steps.
   - **Reverse**: Inverts `direction` (`direction * -1`). In a 2-player match, acts identically to a Skip.
   - **Draw 2**: The next player draws 2 cards from the draw pile and forfeits their turn.
   - **Wild**: Active player chooses the new `activeColor`.
   - **Wild Draw 4**: Active player chooses new `activeColor`; next player draws 4 cards and forfeits their turn.

3. **Draw Pile Exhaustion (Reshuffle)**:
   When `drawPile.length < cardsNeeded`, the server retains the current `topCard` in the discard pile, takes all remaining discard pile cards, applies Fisher-Yates shuffle, and assigns them as the new draw pile.

4. **"Call UNO!" & Penalty Mechanics**:
   - When playing a card that leaves a player with exactly 1 card in hand, the player must declare "UNO!".
   - If they fail to declare UNO before the next player takes an action, any opponent can click "Catch UNO!".
   - If caught, the server forces the penalized player to draw 2 penalty cards from the draw pile.

---

## 5. Real-Time Networking, Reconnection & Cheat Prevention

### 5.1 Socket Event Matrix (`packages/shared/src/types/events.ts`)

| Event | Direction | Payload | Description |
|---|---|---|---|
| `room:create` | Client → Server | `{ hostName: string, turnTimeLimit?: number }` | Creates room, host enters lobby |
| `room:join` | Client → Server | `{ roomId: string, playerName: string, playerId?: string }` | Joins room with session ID |
| `room:leave` | Client → Server | `{}` | Player exits room gracefully |
| `game:start` | Client → Server | `{}` | Host begins match (min 2, max 8) |
| `game:play_card` | Client → Server | `{ cardId: string, chosenColor?: CardColor }` | Plays selected card |
| `game:draw_card` | Client → Server | `{}` | Draws top card from draw pile |
| `game:call_uno` | Client → Server | `{}` | Declares UNO call |
| `game:catch_uno` | Client → Server | `{ targetPlayerId: string }` | Catches undeclared UNO player |
| `game:sync` | Server → Client | `ClientGameState` | Broadcasts masked state to player |
| `game:action_feed` | Server → Client | `{ text: string, type: 'info' \| 'alert' \| 'win' }` | Event notification banner |
| `game:error` | Server → Client | `{ code: string, message: string }` | Rejection error message |

### 5.2 State Masking (Cheat Prevention)

To eliminate the possibility of players inspecting network frames to view opponents' hands or the draw pile sequence:
- The server maintains the master game state with full `hand` arrays and `drawPile`.
- Before emitting `game:sync` to any client, the server transforms the payload:
  - Sets `drawPile = undefined`, exposing only `drawPileCount`.
  - Maps `players` array:
    - Sets `hand` exclusively for `player.id === recipientPlayerId`.
    - Opponent player entries receive `hand = undefined` and `cardsCount = player.hand.length`.

### 5.3 Session & Reconnection Handling

- The client generates a unique `playerId` (UUID v4) stored in browser `sessionStorage`.
- If a socket disconnects unexpectedly (e.g. mobile lock screen, network fluctuation):
  - The player's `isConnected` flag is set to `false`.
  - A 60-second grace timer begins.
  - If the player reconnects with the same `playerId`, their new socket is re-associated with the existing game slot and hands are preserved.
  - If a turn timer expires while disconnected, the server auto-draws and passes the turn.
  - If a player does not reconnect within the grace period, their hand is folded into the discard pile.
  - If the room host leaves, host status is automatically transferred to the next active player.

---

## 6. Optional Custom Card Images

### 6.1 Customization Scope & Image Slots
- Custom card images are **optional** and **room-scoped** (configured by the host in the lobby, visible to all players in that room).
- Available customizable slots:
  - `card_back`: Custom card back texture.
  - `wild`: Custom illustration for Wild cards.
  - `wild_draw4`: Custom illustration for Wild Draw 4 cards.
  - `skip`, `reverse`, `draw2`: Optional custom action card art.
- If no custom image is assigned to a slot, the client renders default vibrant SVG/CSS UNO styling.

### 6.2 Upload & Storage Pipeline
- **Endpoint**: `POST /api/rooms/:roomId/custom-images` (Multipart form-data).
- **Validation**:
  - Allowed MIME types: `image/png`, `image/jpeg`, `image/webp`.
  - Maximum file size: 2MB per image.
  - Content sanitization and dimensions cap (max 1024x1024).
- **Storage**:
  - Saved to `projects/uno-game/uploads/<roomId>/<slot>.<ext>`.
  - Express serves the assets statically at `/uploads/<roomId>/<filename>`.
  - When the room ends or reaches the 5-minute idle expiration, the directory is automatically deleted from disk.

---

## 7. Frontend User Experience & UI Design

### 7.1 Visual Layout & Atmosphere
- **Responsive Table Layout**:
  - Mobile-first, fully responsive design using Tailwind CSS.
  - Center felt table with draw pile, discard pile with slight rotation offsets, active color wheel, and turn direction arrows.
  - Opponents positioned along the top and sides with circular avatars, nameplates, remaining card badges, and connection indicators.
  - Local player hand anchored at the bottom: cards dynamically fan out, overlap neatly on narrow mobile viewports, and lift on hover/focus.
- **Card Renderer (`UnoCard.tsx`)**:
  - Crisp, authentic UNO card aesthetic with large centered symbols and diagonal mini-indices in the corners.
  - Smooth integration of custom image overlays with rounded borders.
  - Visual dimming/grayscale applied to unplayable cards during the player's active turn.

### 7.2 Animations & Audio
- **Framer Motion**:
  - Card dealing: cards smoothly translate from the draw pile into player hands.
  - Playing cards: cards slide from hand into the discard pile with gentle random rotation (-8° to +8°).
  - Wild color picker: spring-animated radial or grid selection dialog.
  - UNO alert: pulsing high-contrast badge when any player reaches 1 card.
- **Audio Feedback**:
  - Subtle sound effects for: card play, card draw, turn ping, "UNO!" call, and round victory.
  - Prominent mute/unmute toggle persisted in `localStorage`.

---

## 8. Deployment & Containerization

### 8.1 Multi-Stage Dockerfile (`projects/uno-game/Dockerfile`)

```dockerfile
# Stage 1: Build client and compile TypeScript
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/server/package*.json ./packages/server/
COPY packages/client/package*.json ./packages/client/
RUN npm ci

COPY . .
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/client
RUN npm run build --workspace=packages/server

# Stage 2: Minimal production runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
COPY packages/server/package*.json ./packages/server/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/client/dist ./packages/client/dist

EXPOSE 3000
CMD ["node", "packages/server/dist/index.js"]
```

### 8.2 Docker Compose (`projects/uno-game/docker-compose.yml`)

```yaml
version: '3.8'

services:
  uno-game:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: perinfoan-uno-game
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3000
    networks:
      - perinfoan-net

networks:
  perinfoan-net:
    external: true
```

---

## 9. Verification & Testing Strategy

1. **Unit Testing (`packages/shared`)**:
   - 100% test coverage on `deck.ts` (verifying exact 108 card distribution: counts per color, value, action type).
   - Move validation test suite covering:
     - Color match, number match, type match.
     - Wild and Wild Draw 4 plays.
     - Invalid moves correctly rejected.
   - State reducer tests for Skip, Reverse (2-player vs N-player), Draw 2, and empty pile reshuffling.
2. **Server Integration Testing (`packages/server`)**:
   - In-memory room creation, joining, and player departure.
   - State masking assertions: confirming that socket payloads sent to player A never contain cards in player B's hand.
   - Graceful disconnect and reconnect tests within the 60-second window.
3. **End-to-End Simulation**:
   - Multi-client simulation script launching 3 automated socket clients to play a full 5-turn sequence, verifying turn alternation and deck consistency.

---

## 10. Summary & Next Steps

This specification establishes an authoritative, cheat-safe, highly responsive, and lightweight multiplayer UNO game fitting cleanly into Perinfoan's decoupled Docker architecture.

Upon review and approval of this specification, the next step is to invoke the `superpowers:writing-plans` skill to generate a structured implementation plan.
