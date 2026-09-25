# Web-Based Multiplayer UNO Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready, cheat-resistant, real-time multiplayer UNO web game with room codes, authoritative rule validation, optional custom card image uploads, and containerized deployment for the Perinfoan circle.

**Architecture:** Monorepo workspace under `projects/uno-game/` containing `packages/shared` (pure TypeScript card/rule engine), `packages/server` (Node.js + Express + Socket.io with in-memory room management and authoritative state masking), and `packages/client` (React + Vite + Tailwind CSS + Framer Motion). Deployed via a single multi-stage Docker container on `perinfoan-net` behind Cloudflare Zero Trust Tunnel.

**Tech Stack:** TypeScript, Node.js 20, Express, Socket.io, React 18, Vite, Tailwind CSS, Framer Motion, Vitest, Docker.

**Spec:** `docs/superpowers/specs/2026-09-24-uno-multiplayer-game-design.md`

## Global Constraints

- Root project directory is `projects/uno-game/`.
- Must not touch `projects/profile/` or alter global Git root configs except registering `uno-game` in root README where needed.
- `packages/shared` must remain 100% pure TypeScript with zero external runtime dependencies.
- Authoritative state masking: Opponent hands and the draw pile must never be exposed over the network.
- Custom card images are room-scoped, optional, and support PNG/JPEG/WebP under 2MB.
- Container must run on external Docker network `perinfoan-net` listening on port `3000`.

## Review Focus

1. **Draw pile exhaustion during multi-card draw**: When a player draws multiple cards (e.g. Draw 2 or Wild Draw 4) and the draw pile runs empty mid-draw, verify that discard pile reshuffle seamlessly provides the remaining cards without losing the current top card.
2. **2-Player Reverse card edge case**: In a 2-player game, playing Reverse must act as a Skip (retaining the turn for the active player) rather than inverting direction to the other player.
3. **State masking leak**: Network broadcasts (`game:sync`) must never contain `hand` arrays for other players, and the server-side `drawPile` array must be omitted entirely (only `drawPileCount` is public).
4. **UNO penalty catch window**: If a player with 1 card does not call UNO before the next turn action occurs, an opponent calling `game:catch_uno` must successfully trigger a 2-card draw penalty.
5. **Session reconnection within grace period**: When a player refreshes their browser tab or reconnects their socket with their `playerId`, they must re-bind to their existing seat and receive their current hand intact.

---

### Task 1: Workspace & Monorepo Scaffolding

**Files:**
- Create: `projects/uno-game/package.json`
- Create: `projects/uno-game/tsconfig.base.json`
- Create: `projects/uno-game/.gitignore`
- Create: `projects/uno-game/packages/shared/package.json`
- Create: `projects/uno-game/packages/shared/tsconfig.json`

**Interfaces:**
- Produces: Base TypeScript configuration and npm workspace layout linking `@uno/shared`, `@uno/server`, and `@uno/client`.

- [ ] **Step 1: Create workspace root package.json and tsconfig.base.json**

```json
// projects/uno-game/package.json
{
  "name": "uno-game-monorepo",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present"
  }
}
```

```json
// projects/uno-game/tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 2: Create packages/shared/package.json and tsconfig.json**

```json
// projects/uno-game/packages/shared/package.json
{
  "name": "@uno/shared",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

```json
// projects/uno-game/packages/shared/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Install workspace dependencies & verify root package setup**

Run: `cd projects/uno-game && npm install`
Expected: `node_modules` generated, workspaces recognized.

- [ ] **Step 4: Commit**

```bash
git add projects/uno-game/package.json projects/uno-game/tsconfig.base.json projects/uno-game/packages/shared/package.json projects/uno-game/packages/shared/tsconfig.json
git commit -m "chore(uno): scaffold workspace and shared package configuration"
```

---

### Task 2: Shared Domain Types & Constants

**Files:**
- Create: `projects/uno-game/packages/shared/src/types/card.ts`
- Create: `projects/uno-game/packages/shared/src/types/player.ts`
- Create: `projects/uno-game/packages/shared/src/types/room.ts`
- Create: `projects/uno-game/packages/shared/src/types/events.ts`
- Create: `projects/uno-game/packages/shared/src/constants.ts`
- Create: `projects/uno-game/packages/shared/src/index.ts`

**Interfaces:**
- Produces: `Card`, `CardColor`, `CardType`, `Player`, `ClientGameState`, `MasterGameState`, `SocketEventMap`.

- [ ] **Step 1: Define Card and Color types in packages/shared/src/types/card.ts**

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
  customImageSlot?: string; // Optional custom art mapping key
}
```

- [ ] **Step 2: Define Player, Room, and GameState models**

```typescript
// projects/uno-game/packages/shared/src/types/player.ts
import { Card } from './card.js';

export interface Player {
  id: string;               // Session ID (persisted in client sessionStorage)
  socketId: string;
  name: string;
  isHost: boolean;
  cardsCount: number;
  hand?: Card[];            // Populated ONLY for client's own hand
  hasCalledUno: boolean;
  isConnected: boolean;
  lastActiveAt: number;
}
```

```typescript
// projects/uno-game/packages/shared/src/types/room.ts
import { Card, CardColor } from './card.js';
import { Player } from './player.js';

export type RoomStatus = 'lobby' | 'playing' | 'ended';
export type Direction = 1 | -1;

export interface ClientGameState {
  roomId: string;
  status: RoomStatus;
  players: Player[];
  activePlayerIndex: number;
  direction: Direction;
  topCard: Card;
  activeColor: CardColor;
  drawPileCount: number;
  turnTimeLimit: number;
  turnRemainingSeconds: number;
  winnerId: string | null;
  customImages: Record<string, string>;
}

export interface MasterGameState extends Omit<ClientGameState, 'players'> {
  drawPile: Card[];
  discardPile: Card[];
  players: (Player & { hand: Card[] })[];
}
```

- [ ] **Step 3: Define Socket event contracts and constants**

```typescript
// projects/uno-game/packages/shared/src/constants.ts
export const INITIAL_CARDS_PER_PLAYER = 7;
export const DEFAULT_TURN_TIMEOUT_SECONDS = 30;
export const RECONNECTION_GRACE_PERIOD_MS = 60000;
export const ROOM_ID_LENGTH = 6;
export const MAX_PLAYERS_PER_ROOM = 8;
export const MIN_PLAYERS_PER_ROOM = 2;
export const UNO_PENALTY_DRAW_COUNT = 2;
```

```typescript
// projects/uno-game/packages/shared/src/index.ts
export * from './types/card.js';
export * from './types/player.js';
export * from './types/room.js';
export * from './types/events.js';
export * from './constants.js';
```

- [ ] **Step 4: Build shared package to verify types compile**

Run: `cd projects/uno-game/packages/shared && npm run build`
Expected: `dist/` directory generated with `.js` and `.d.ts` files without type errors.

- [ ] **Step 5: Commit**

```bash
git add projects/uno-game/packages/shared/src/
git commit -m "feat(shared): define UNO card, room, player models and socket event contracts"
```

---

### Task 3: Shared UNO Deck & Shuffling Engine (TDD)

**Files:**
- Create: `projects/uno-game/packages/shared/src/engine/deck.ts`
- Create: `projects/uno-game/packages/shared/tests/deck.test.ts`

**Interfaces:**
- Produces: `createDeck(): Card[]`, `shuffleDeck(deck: Card[]): Card[]`, `dealCards(deck: Card[], playerCount: number, cardsPerPlayer: number): { hands: Card[][], remainingDeck: Card[] }`.

- [ ] **Step 1: Write failing unit test for 108-card deck distribution**

```typescript
// projects/uno-game/packages/shared/tests/deck.test.ts
import { describe, it, expect } from 'vitest';
import { createDeck, shuffleDeck, dealCards } from '../src/engine/deck.js';

describe('UNO Deck Engine', () => {
  it('creates an official 108-card deck with correct color and card type distribution', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(108);

    const colors = ['red', 'blue', 'green', 'yellow'];
    for (const color of colors) {
      const colorCards = deck.filter(c => c.color === color);
      expect(colorCards).toHaveLength(25); // 1 zero, 2x(1-9), 2 skip, 2 reverse, 2 draw2

      const zeros = colorCards.filter(c => c.type === 'number' && c.value === 0);
      expect(zeros).toHaveLength(1);

      for (let v = 1; v <= 9; v++) {
        const numbers = colorCards.filter(c => c.type === 'number' && c.value === v);
        expect(numbers).toHaveLength(2);
      }

      expect(colorCards.filter(c => c.type === 'skip')).toHaveLength(2);
      expect(colorCards.filter(c => c.type === 'reverse')).toHaveLength(2);
      expect(colorCards.filter(c => c.type === 'draw2')).toHaveLength(2);
    }

    const wilds = deck.filter(c => c.color === 'wild');
    expect(wilds).toHaveLength(8);
    expect(wilds.filter(c => c.type === 'wild')).toHaveLength(4);
    expect(wilds.filter(c => c.type === 'wild_draw4')).toHaveLength(4);
  });

  it('deals cards correctly among players and returns remaining deck', () => {
    const deck = createDeck();
    const { hands, remainingDeck } = dealCards(deck, 4, 7);
    expect(hands).toHaveLength(4);
    hands.forEach(hand => expect(hand).toHaveLength(7));
    expect(remainingDeck).toHaveLength(108 - (4 * 7));
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd projects/uno-game/packages/shared && npm run test`
Expected: FAIL ("createDeck is not defined").

- [ ] **Step 3: Implement deck creation and Fisher-Yates shuffle**

```typescript
// projects/uno-game/packages/shared/src/engine/deck.ts
import { Card, CardColor, CardType } from '../types/card.js';

export function createDeck(): Card[] {
  const deck: Card[] = [];
  const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];

  colors.forEach(color => {
    deck.push({ id: `${color}-0`, color, type: 'number', value: 0 });
    for (let v = 1; v <= 9; v++) {
      deck.push({ id: `${color}-${v}-a`, color, type: 'number', value: v });
      deck.push({ id: `${color}-${v}-b`, color, type: 'number', value: v });
    }
    ['skip', 'reverse', 'draw2'].forEach((action) => {
      deck.push({ id: `${color}-${action}-a`, color, type: action as CardType });
      deck.push({ id: `${color}-${action}-b`, color, type: action as CardType });
    });
  });

  for (let i = 1; i <= 4; i++) {
    deck.push({ id: `wild-${i}`, color: 'wild', type: 'wild' });
    deck.push({ id: `wild-draw4-${i}`, color: 'wild', type: 'wild_draw4' });
  }

  return deck;
}

export function shuffleDeck<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function dealCards(deck: Card[], playerCount: number, cardsPerPlayer: number): { hands: Card[][]; remainingDeck: Card[] } {
  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  const remainingDeck = [...deck];

  for (let i = 0; i < cardsPerPlayer; i++) {
    for (let p = 0; p < playerCount; p++) {
      const card = remainingDeck.shift();
      if (card) hands[p].push(card);
    }
  }

  return { hands, remainingDeck };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd projects/uno-game/packages/shared && npm run test`
Expected: PASS (all deck distribution and dealing tests pass).

- [ ] **Step 5: Commit**

```bash
git add projects/uno-game/packages/shared/src/engine/deck.ts projects/uno-game/packages/shared/tests/deck.test.ts
git commit -m "feat(shared): implement 108-card deck generator, shuffler, and dealing algorithm"
```

---

### Task 4: Shared Rule Validator & State Reducer (TDD)

**Files:**
- Create: `projects/uno-game/packages/shared/src/engine/rules.ts`
- Create: `projects/uno-game/packages/shared/src/engine/reducer.ts`
- Create: `projects/uno-game/packages/shared/tests/rules.test.ts`
- Create: `projects/uno-game/packages/shared/tests/reducer.test.ts`

**Interfaces:**
- Produces: `canPlayCard(card: Card, topCard: Card, activeColor: CardColor): boolean`, `applyCardPlay(state: MasterGameState, playerId: string, cardId: string, chosenColor?: CardColor): MasterGameState`, `applyDraw(state: MasterGameState, playerId: string): MasterGameState`.

- [ ] **Step 1: Write unit tests for rules.ts (color matching, number matching, wild cards)**

```typescript
// projects/uno-game/packages/shared/tests/rules.test.ts
import { describe, it, expect } from 'vitest';
import { canPlayCard } from '../src/engine/rules.js';
import { Card } from '../src/types/card.js';

describe('UNO Rule Validation', () => {
  const red7: Card = { id: 'red-7', color: 'red', type: 'number', value: 7 };
  const blue7: Card = { id: 'blue-7', color: 'blue', type: 'number', value: 7 };
  const redSkip: Card = { id: 'red-skip', color: 'red', type: 'skip' };
  const greenSkip: Card = { id: 'green-skip', color: 'green', type: 'skip' };
  const wild: Card = { id: 'wild-1', color: 'wild', type: 'wild' };
  const yellow3: Card = { id: 'yellow-3', color: 'yellow', type: 'number', value: 3 };

  it('allows same color or same number', () => {
    expect(canPlayCard(blue7, red7, 'red')).toBe(true); // matching value 7
    expect(canPlayCard(redSkip, red7, 'red')).toBe(true); // matching active color red
    expect(canPlayCard(yellow3, red7, 'red')).toBe(false); // different color and value
  });

  it('allows action card on same action card regardless of color', () => {
    expect(canPlayCard(greenSkip, redSkip, 'red')).toBe(true);
  });

  it('always allows wild cards', () => {
    expect(canPlayCard(wild, red7, 'red')).toBe(true);
  });
});
```

- [ ] **Step 2: Write tests for action card effects, reshuffling on empty pile, and 2-player Reverse edge case**

```typescript
// projects/uno-game/packages/shared/tests/reducer.test.ts
import { describe, it, expect } from 'vitest';
import { applyCardPlay, applyDraw } from '../src/engine/reducer.js';
import { MasterGameState } from '../src/types/room.js';

describe('Game State Reducer', () => {
  function createTestState(playerCount: number = 3): MasterGameState {
    return {
      roomId: 'TEST01',
      status: 'playing',
      players: Array.from({ length: playerCount }, (_, i) => ({
        id: `p${i}`,
        socketId: `s${i}`,
        name: `Player ${i}`,
        isHost: i === 0,
        cardsCount: 2,
        hand: [
          { id: `red-${i}`, color: 'red', type: 'number', value: i },
          { id: `blue-${i}`, color: 'blue', type: 'number', value: i + 1 }
        ],
        hasCalledUno: false,
        isConnected: true,
        lastActiveAt: Date.now()
      })),
      activePlayerIndex: 0,
      direction: 1,
      topCard: { id: 'red-9', color: 'red', type: 'number', value: 9 },
      activeColor: 'red',
      drawPile: [{ id: 'yellow-1', color: 'yellow', type: 'number', value: 1 }],
      discardPile: [{ id: 'red-9', color: 'red', type: 'number', value: 9 }],
      drawPileCount: 1,
      turnTimeLimit: 30,
      turnRemainingSeconds: 30,
      winnerId: null,
      customImages: {}
    };
  }

  it('advances turn to next player on standard number card play', () => {
    const state = createTestState(3);
    const nextState = applyCardPlay(state, 'p0', 'red-0');
    expect(nextState.activePlayerIndex).toBe(1);
    expect(nextState.topCard.id).toBe('red-0');
  });

  it('acts as skip in 2-player game when reverse is played (Review Focus #2)', () => {
    const state = createTestState(2);
    state.players[0].hand.push({ id: 'red-rev', color: 'red', type: 'reverse' });
    const nextState = applyCardPlay(state, 'p0', 'red-rev');
    // In 2-player game, reverse skips player 1 and returns turn to player 0
    expect(nextState.activePlayerIndex).toBe(0);
  });

  it('reshuffles discard pile when draw pile is empty during multi-card draw (Review Focus #1)', () => {
    const state = createTestState(2);
    state.drawPile = [];
    state.discardPile = [
      { id: 'old-1', color: 'green', type: 'number', value: 1 },
      { id: 'old-2', color: 'green', type: 'number', value: 2 },
      { id: 'top-card', color: 'red', type: 'number', value: 9 } // top card must stay
    ];
    state.topCard = state.discardPile[2];

    const nextState = applyDraw(state, 'p0');
    expect(nextState.players[0].hand).toHaveLength(3);
    expect(nextState.topCard.id).toBe('top-card');
  });
});
```

- [ ] **Step 3: Implement rules.ts and reducer.ts**

```typescript
// projects/uno-game/packages/shared/src/engine/rules.ts
import { Card, CardColor } from '../types/card.js';

export function canPlayCard(card: Card, topCard: Card, activeColor: CardColor): boolean {
  if (card.color === 'wild') return true;
  if (card.color === activeColor) return true;
  if (card.type === topCard.type && card.type !== 'number') return true;
  if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) return true;
  return false;
}
```

```typescript
// projects/uno-game/packages/shared/src/engine/reducer.ts
import { Card, CardColor } from '../types/card.js';
import { MasterGameState } from '../types/room.js';
import { canPlayCard } from './rules.js';
import { shuffleDeck } from './deck.js';

function nextTurnIndex(currentIndex: number, playerCount: number, step: number, direction: 1 | -1): number {
  const delta = step * direction;
  return (currentIndex + delta % playerCount + playerCount) % playerCount;
}

export function ensureDrawCards(state: MasterGameState, count: number): { cards: Card[]; newState: MasterGameState } {
  let drawPile = [...state.drawPile];
  let discardPile = [...state.discardPile];

  if (drawPile.length < count) {
    const currentTop = discardPile[discardPile.length - 1];
    const cardsToShuffle = discardPile.slice(0, -1);
    drawPile = [...drawPile, ...shuffleDeck(cardsToShuffle)];
    discardPile = currentTop ? [currentTop] : [];
  }

  const drawn = drawPile.splice(0, count);
  return {
    cards: drawn,
    newState: {
      ...state,
      drawPile,
      discardPile,
      drawPileCount: drawPile.length
    }
  };
}

export function applyCardPlay(
  state: MasterGameState,
  playerId: string,
  cardId: string,
  chosenColor?: CardColor
): MasterGameState {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex !== state.activePlayerIndex) throw new Error('Not your turn');

  const player = state.players[playerIndex];
  const cardIndex = player.hand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) throw new Error('Card not in hand');

  const card = player.hand[cardIndex];
  if (!canPlayCard(card, state.topCard, state.activeColor)) {
    throw new Error('Illegal card play');
  }

  const newHand = [...player.hand];
  newHand.splice(cardIndex, 1);

  let newDirection = state.direction;
  let turnStep = 1;
  let activeColor = card.color === 'wild' ? (chosenColor || 'red') : card.color;

  let intermediateState: MasterGameState = {
    ...state,
    topCard: card,
    activeColor,
    discardPile: [...state.discardPile, card]
  };

  if (card.type === 'reverse') {
    if (state.players.length === 2) {
      turnStep = 2; // Acts as skip
    } else {
      newDirection = (newDirection * -1) as 1 | -1;
    }
  } else if (card.type === 'skip') {
    turnStep = 2;
  } else if (card.type === 'draw2') {
    turnStep = 2;
    const targetIdx = nextTurnIndex(playerIndex, state.players.length, 1, newDirection);
    const { cards, newState } = ensureDrawCards(intermediateState, 2);
    intermediateState = newState;
    intermediateState.players[targetIdx].hand.push(...cards);
    intermediateState.players[targetIdx].cardsCount = intermediateState.players[targetIdx].hand.length;
  } else if (card.type === 'wild_draw4') {
    turnStep = 2;
    const targetIdx = nextTurnIndex(playerIndex, state.players.length, 1, newDirection);
    const { cards, newState } = ensureDrawCards(intermediateState, 4);
    intermediateState = newState;
    intermediateState.players[targetIdx].hand.push(...cards);
    intermediateState.players[targetIdx].cardsCount = intermediateState.players[targetIdx].hand.length;
  }

  const updatedPlayers = intermediateState.players.map((p, idx) => {
    if (idx === playerIndex) {
      return {
        ...p,
        hand: newHand,
        cardsCount: newHand.length,
        hasCalledUno: newHand.length === 1 ? p.hasCalledUno : false
      };
    }
    return p;
  });

  const winnerId = newHand.length === 0 ? player.id : null;
  const nextPlayer = nextTurnIndex(playerIndex, state.players.length, turnStep, newDirection);

  return {
    ...intermediateState,
    players: updatedPlayers,
    direction: newDirection,
    activePlayerIndex: winnerId ? playerIndex : nextPlayer,
    winnerId,
    status: winnerId ? 'ended' : 'playing',
    turnRemainingSeconds: state.turnTimeLimit
  };
}

export function applyDraw(state: MasterGameState, playerId: string): MasterGameState {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex !== state.activePlayerIndex) throw new Error('Not your turn');

  const { cards, newState } = ensureDrawCards(state, 1);
  const updatedPlayers = newState.players.map((p, idx) => {
    if (idx === playerIndex) {
      const hand = [...p.hand, ...cards];
      return { ...p, hand, cardsCount: hand.length };
    }
    return p;
  });

  return {
    ...newState,
    players: updatedPlayers,
    activePlayerIndex: nextTurnIndex(playerIndex, state.players.length, 1, state.direction),
    turnRemainingSeconds: state.turnTimeLimit
  };
}
```

- [ ] **Step 4: Run unit tests to verify rules and reducer pass**

Run: `cd projects/uno-game/packages/shared && npm run test`
Expected: PASS (all tests in `rules.test.ts` and `reducer.test.ts` pass).

- [ ] **Step 5: Export engine from index and build shared package**

Export engine functions in `packages/shared/src/index.ts` and run:
`cd projects/uno-game/packages/shared && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add projects/uno-game/packages/shared/src/engine/ projects/uno-game/packages/shared/tests/
git commit -m "feat(shared): implement authoritative UNO rule validator and game state reducer with tests"
```

---

### Task 5: Server Scaffolding & State Masking (Cheat Prevention)

**Files:**
- Create: `projects/uno-game/packages/server/package.json`
- Create: `projects/uno-game/packages/server/tsconfig.json`
- Create: `projects/uno-game/packages/server/src/utils/stateMask.ts`
- Create: `projects/uno-game/packages/server/tests/stateMask.test.ts`

**Interfaces:**
- Produces: `maskStateForPlayer(masterState: MasterGameState, targetPlayerId: string): ClientGameState`.

- [ ] **Step 1: Create packages/server/package.json and tsconfig.json**

```json
// projects/uno-game/packages/server/package.json
{
  "name": "@uno/server",
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
    "@uno/shared": "*",
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "multer": "^1.4.5-lts.1",
    "socket.io": "^4.7.5"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/multer": "^1.4.11",
    "@types/node": "^20.12.7",
    "supertest": "^6.3.4",
    "tsx": "^4.7.2",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Write failing test asserting opponent cards are never exposed (Review Focus #3)**

```typescript
// projects/uno-game/packages/server/tests/stateMask.test.ts
import { describe, it, expect } from 'vitest';
import { maskStateForPlayer } from '../src/utils/stateMask.js';
import { MasterGameState } from '@uno/shared';

describe('Authoritative State Masking', () => {
  it('masks other players cards and strips draw pile completely', () => {
    const masterState: MasterGameState = {
      roomId: 'MASK01',
      status: 'playing',
      players: [
        {
          id: 'player-1',
          socketId: 's1',
          name: 'Alice',
          isHost: true,
          cardsCount: 2,
          hand: [{ id: 'red-1', color: 'red', type: 'number', value: 1 }],
          hasCalledUno: false,
          isConnected: true,
          lastActiveAt: Date.now()
        },
        {
          id: 'player-2',
          socketId: 's2',
          name: 'Bob',
          isHost: false,
          cardsCount: 2,
          hand: [{ id: 'blue-5', color: 'blue', type: 'number', value: 5 }],
          hasCalledUno: false,
          isConnected: true,
          lastActiveAt: Date.now()
        }
      ],
      activePlayerIndex: 0,
      direction: 1,
      topCard: { id: 'red-9', color: 'red', type: 'number', value: 9 },
      activeColor: 'red',
      drawPile: [{ id: 'yellow-2', color: 'yellow', type: 'number', value: 2 }],
      discardPile: [],
      drawPileCount: 1,
      turnTimeLimit: 30,
      turnRemainingSeconds: 30,
      winnerId: null,
      customImages: {}
    };

    const clientState = maskStateForPlayer(masterState, 'player-1');

    // 1. Draw pile array must not exist on client state
    expect((clientState as any).drawPile).toBeUndefined();
    expect(clientState.drawPileCount).toBe(1);

    // 2. Player 1 sees own hand
    expect(clientState.players[0].hand).toBeDefined();
    expect(clientState.players[0].hand![0].id).toBe('red-1');

    // 3. Player 1 CANNOT see Bob's hand (must be undefined)
    expect(clientState.players[1].hand).toBeUndefined();
    expect(clientState.players[1].cardsCount).toBe(2);
  });
});
```

- [ ] **Step 3: Implement stateMask.ts**

```typescript
// projects/uno-game/packages/server/src/utils/stateMask.ts
import { MasterGameState, ClientGameState, Player } from '@uno/shared';

export function maskStateForPlayer(masterState: MasterGameState, targetPlayerId: string): ClientGameState {
  const maskedPlayers: Player[] = masterState.players.map(p => ({
    id: p.id,
    socketId: p.socketId,
    name: p.name,
    isHost: p.isHost,
    cardsCount: p.hand ? p.hand.length : p.cardsCount,
    hasCalledUno: p.hasCalledUno,
    isConnected: p.isConnected,
    lastActiveAt: p.lastActiveAt,
    hand: p.id === targetPlayerId ? p.hand : undefined
  }));

  const { drawPile, discardPile, ...safeState } = masterState;

  return {
    ...safeState,
    players: maskedPlayers,
    drawPileCount: drawPile ? drawPile.length : masterState.drawPileCount
  };
}
```

- [ ] **Step 4: Run test to verify state masking passes**

Run: `cd projects/uno-game/packages/server && npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add projects/uno-game/packages/server/
git commit -m "feat(server): scaffold server package and implement cheat-resistant state masking"
```

---

### Task 6: In-Memory Room Lifecycle & GameRoom Engine

**Files:**
- Create: `projects/uno-game/packages/server/src/rooms/GameRoom.ts`
- Create: `projects/uno-game/packages/server/src/rooms/RoomManager.ts`
- Create: `projects/uno-game/packages/server/tests/roomManager.test.ts`

**Interfaces:**
- Produces: `RoomManager.createRoom(hostName, turnTimeout): GameRoom`, `RoomManager.getRoom(roomId): GameRoom | undefined`, `GameRoom.addPlayer(name, playerId, socketId): Player`, `GameRoom.start(): void`, `GameRoom.callUno(playerId): boolean`, `GameRoom.catchUno(callerId, targetId): boolean`.

- [ ] **Step 1: Write unit tests for room code generation, player joining, and UNO catch penalty (Review Focus #4)**

```typescript
// projects/uno-game/packages/server/tests/roomManager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from '../src/rooms/RoomManager.js';

describe('Room Manager & Game Room Lifecycle', () => {
  let manager: RoomManager;

  beforeEach(() => {
    manager = new RoomManager();
  });

  it('generates 6-character room codes and registers new room', () => {
    const room = manager.createRoom('HostPlayer', 30);
    expect(room.id).toHaveLength(6);
    expect(room.players).toHaveLength(1);
    expect(room.players[0].isHost).toBe(true);
    expect(manager.getRoom(room.id)).toBe(room);
  });

  it('enforces UNO penalty when player fails to call UNO (Review Focus #4)', () => {
    const room = manager.createRoom('HostPlayer', 30);
    room.addPlayer('Player2', 'p2-id', 's2');
    room.start();

    // Set player 2 to 1 card and hasCalledUno = false
    room.state.players[1].hand = [{ id: 'red-1', color: 'red', type: 'number', value: 1 }];
    room.state.players[1].cardsCount = 1;
    room.state.players[1].hasCalledUno = false;

    // Host catches Player 2
    const penaltyApplied = room.catchUno(room.players[0].id, 'p2-id');
    expect(penaltyApplied).toBe(true);
    expect(room.state.players[1].hand.length).toBe(3); // 1 original + 2 penalty
  });
});
```

- [ ] **Step 2: Implement GameRoom.ts and RoomManager.ts**

Implement room creation, alphanumeric code generator (`ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`), timer ticks, game start, dealing 7 cards, UNO call/catch, and auto-cleanup after 5 minutes of inactivity.

- [ ] **Step 3: Run roomManager tests**

Run: `cd projects/uno-game/packages/server && npm run test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add projects/uno-game/packages/server/src/rooms/ projects/uno-game/packages/server/tests/roomManager.test.ts
git commit -m "feat(server): implement in-memory GameRoom state and RoomManager lifecycle"
```

---

### Task 7: Server Socket.io Gateway & Event Handlers

**Files:**
- Create: `projects/uno-game/packages/server/src/sockets/handler.ts`
- Create: `projects/uno-game/packages/server/src/index.ts`
- Create: `projects/uno-game/packages/server/tests/socketIntegration.test.ts`

**Interfaces:**
- Produces: Express HTTP server + Socket.io gateway handling `room:create`, `room:join`, `game:play_card`, `game:draw_card`, `game:call_uno`, `game:catch_uno`, with reconnection support (Review Focus #5).

- [ ] **Step 1: Write integration test testing connection, play card, and reconnection**

```typescript
// projects/uno-game/packages/server/tests/socketIntegration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import express from 'express';
import { setupSocketHandlers } from '../src/sockets/handler.js';
import { RoomManager } from '../src/rooms/RoomManager.js';

describe('Socket.io Multiplayer Integration', () => {
  let server: any;
  let io: Server;
  let port: number;
  let client1: ClientSocket;
  let client2: ClientSocket;

  beforeAll(async () => {
    const app = express();
    server = createServer(app);
    io = new Server(server, { cors: { origin: '*' } });
    const roomManager = new RoomManager();
    setupSocketHandlers(io, roomManager);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        port = (server.address() as any).port;
        resolve();
      });
    });
  });

  afterAll(() => {
    io.close();
    server.close();
  });

  it('handles room creation and player join with state sync', async () => {
    client1 = Client(`http://localhost:${port}`);
    client2 = Client(`http://localhost:${port}`);

    const roomCode = await new Promise<string>((resolve) => {
      client1.emit('room:create', { hostName: 'Alice' }, (res: any) => {
        resolve(res.roomId);
      });
    });

    expect(roomCode).toHaveLength(6);

    const joinSuccess = await new Promise<boolean>((resolve) => {
      client2.emit('room:join', { roomId: roomCode, playerName: 'Bob', playerId: 'bob-uuid' }, (res: any) => {
        resolve(res.success);
      });
    });

    expect(joinSuccess).toBe(true);
    client1.disconnect();
    client2.disconnect();
  });
});
```

- [ ] **Step 2: Implement socket handler and Express app entry point**

Implement `src/sockets/handler.ts` connecting incoming socket events to the `RoomManager`, broadcasting masked states via `maskStateForPlayer`, and handling disconnect/reconnect bindings.

- [ ] **Step 3: Run integration test to verify it passes**

Run: `cd projects/uno-game/packages/server && npm run test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add projects/uno-game/packages/server/src/ projects/uno-game/packages/server/tests/socketIntegration.test.ts
git commit -m "feat(server): implement Socket.io gateway with room routing and reconnection"
```

---

### Task 8: Optional Custom Card Images Upload Route

**Files:**
- Create: `projects/uno-game/packages/server/src/routes/uploads.ts`
- Create: `projects/uno-game/packages/server/tests/uploads.test.ts`

**Interfaces:**
- Produces: `POST /api/rooms/:roomId/custom-images` handling multipart uploads for `card_back`, `wild`, `wild_draw4`, etc.

- [ ] **Step 1: Write integration test for custom image upload validation**

```typescript
// projects/uno-game/packages/server/tests/uploads.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createUploadRouter } from '../src/routes/uploads.js';
import { RoomManager } from '../src/rooms/RoomManager.js';

describe('Custom Image Uploads Route', () => {
  it('accepts valid PNG image and attaches URL to room state', async () => {
    const app = express();
    const roomManager = new RoomManager();
    const room = roomManager.createRoom('Host', 30);
    app.use('/api', createUploadRouter(roomManager));

    const res = await request(app)
      .post(`/api/rooms/${room.id}/custom-images`)
      .field('slot', 'wild')
      .attach('image', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'wild.png');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(room.state.customImages.wild).toContain(`/uploads/${room.id}/`);
  });
});
```

- [ ] **Step 2: Implement upload route using Multer with 2MB limit and PNG/JPEG/WebP filter**

- [ ] **Step 3: Run tests to verify upload handling**

Run: `cd projects/uno-game/packages/server && npm run test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add projects/uno-game/packages/server/src/routes/uploads.ts projects/uno-game/packages/server/tests/uploads.test.ts
git commit -m "feat(server): add Multer image upload route for room-scoped custom card art"
```

---

### Task 9: Frontend Client Scaffolding (Vite + React + Tailwind)

**Files:**
- Create: `projects/uno-game/packages/client/package.json`
- Create: `projects/uno-game/packages/client/tsconfig.json`
- Create: `projects/uno-game/packages/client/vite.config.ts`
- Create: `projects/uno-game/packages/client/tailwind.config.js`
- Create: `projects/uno-game/packages/client/postcss.config.js`
- Create: `projects/uno-game/packages/client/index.html`
- Create: `projects/uno-game/packages/client/src/main.tsx`
- Create: `projects/uno-game/packages/client/src/App.tsx`
- Create: `projects/uno-game/packages/client/src/index.css`

**Interfaces:**
- Produces: React + Vite + Tailwind frontend workspace compiling without errors.

- [ ] **Step 1: Create client package.json and configuration files**

```json
// projects/uno-game/packages/client/package.json
{
  "name": "@uno/client",
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
    "@uno/shared": "*",
    "clsx": "^2.1.1",
    "framer-motion": "^11.2.0",
    "lucide-react": "^0.378.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "socket.io-client": "^4.7.5",
    "tailwind-merge": "^2.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.2",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "typescript": "^5.4.0",
    "vite": "^5.2.11",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Setup Tailwind configuration and base styles in index.css**

- [ ] **Step 3: Verify client builds successfully**

Run: `cd projects/uno-game/packages/client && npm run build`
Expected: `dist/` directory generated with static HTML/JS/CSS.

- [ ] **Step 4: Commit**

```bash
git add projects/uno-game/packages/client/
git commit -m "chore(client): scaffold React + Vite + Tailwind CSS client package"
```

---

### Task 10: Client UNO Card Component with Custom Image Fallback

**Files:**
- Create: `projects/uno-game/packages/client/src/components/card/UnoCard.tsx`
- Create: `projects/uno-game/packages/client/tests/UnoCard.test.tsx`

**Interfaces:**
- Produces: `<UnoCard card={card} isPlayable={true} customImage={imageUrl} onClick={() => {}} />`.

- [ ] **Step 1: Write component test asserting card renders correct numbers, colors, and custom image overlay when provided**

- [ ] **Step 2: Implement UnoCard.tsx with authentic SVG/CSS typography, color themes (red, blue, green, yellow, wild), and image fallback**

- [ ] **Step 3: Run component tests**

Run: `cd projects/uno-game/packages/client && npm run test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add projects/uno-game/packages/client/src/components/card/ projects/uno-game/packages/client/tests/
git commit -m "feat(client): implement authentic UnoCard component with custom image fallback"
```

---

### Task 11: Client Lobby & Custom Image Upload UI

**Files:**
- Create: `projects/uno-game/packages/client/src/components/lobby/LobbyView.tsx`
- Create: `projects/uno-game/packages/client/src/components/lobby/CustomImageUploader.tsx`
- Create: `projects/uno-game/packages/client/src/components/ui/Button.tsx`
- Create: `projects/uno-game/packages/client/src/components/ui/Modal.tsx`

**Interfaces:**
- Produces: Room creation modal, 6-character room code join form, shareable link copy button, and optional host image uploader modal.

- [ ] **Step 1: Implement LobbyView and CustomImageUploader components with Tailwind styling**
- [ ] **Step 2: Add validation for room code format (6 alphanumeric characters) and file size checks (<2MB)**
- [ ] **Step 3: Test client build**

Run: `cd projects/uno-game/packages/client && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add projects/uno-game/packages/client/src/components/lobby/ projects/uno-game/packages/client/src/components/ui/
git commit -m "feat(client): implement room lobby view and optional custom image uploader"
```

---

### Task 12: Client Game Table, Opponents, Hand & Action Controls

**Files:**
- Create: `projects/uno-game/packages/client/src/components/game/Table.tsx`
- Create: `projects/uno-game/packages/client/src/components/game/Hand.tsx`
- Create: `projects/uno-game/packages/client/src/components/game/OpponentBadge.tsx`
- Create: `projects/uno-game/packages/client/src/components/game/ColorPicker.tsx`
- Create: `projects/uno-game/packages/client/src/components/game/UnoButton.tsx`
- Create: `projects/uno-game/packages/client/src/components/game/TurnTimer.tsx`

**Interfaces:**
- Produces: Full interactive game screen with Framer Motion animations for dealt cards, color wheel selection modal, and prominent "Call UNO!" / "Catch UNO!" controls.

- [ ] **Step 1: Implement Hand.tsx with fanned-out layout, hover lift, and touch-friendly mobile stacking**
- [ ] **Step 2: Implement Table.tsx with center discard pile, draw pile counter, turn timer, and direction arrows**
- [ ] **Step 3: Implement ColorPicker.tsx for wild card color choice with red, blue, green, yellow radial buttons**
- [ ] **Step 4: Implement UnoButton.tsx for declaring UNO and catching opponents**
- [ ] **Step 5: Test client build**

Run: `cd projects/uno-game/packages/client && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add projects/uno-game/packages/client/src/components/game/
git commit -m "feat(client): implement game table, interactive hand, opponent indicators, and action buttons"
```

---

### Task 13: Client Socket Synchronization Hook & Reconnection Handling

**Files:**
- Create: `projects/uno-game/packages/client/src/hooks/useSocket.ts`
- Create: `projects/uno-game/packages/client/src/hooks/useGameState.ts`
- Create: `projects/uno-game/packages/client/src/hooks/useAudio.ts`
- Modify: `projects/uno-game/packages/client/src/App.tsx`

**Interfaces:**
- Produces: Integrated React application synchronizing `ClientGameState` via Socket.io with audio triggers and automatic session recovery.

- [ ] **Step 1: Implement useSocket.ts with persistent sessionStorage playerId and auto-reconnect**
- [ ] **Step 2: Implement useGameState.ts with optimistic client predictions and server sync reconciliation**
- [ ] **Step 3: Implement useAudio.ts using Web Audio API synthesis for card deals, clicks, and UNO pings**
- [ ] **Step 4: Connect LobbyView and GameView in App.tsx based on state.status**
- [ ] **Step 5: Verify client build**

Run: `cd projects/uno-game/packages/client && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add projects/uno-game/packages/client/src/hooks/ projects/uno-game/packages/client/src/App.tsx
git commit -m "feat(client): integrate socket synchronization hooks, session recovery, and audio feedback"
```

---

### Task 14: Multi-Stage Dockerfile & Docker Compose Setup

**Files:**
- Create: `projects/uno-game/Dockerfile`
- Create: `projects/uno-game/docker-compose.yml`
- Create: `projects/uno-game/README.md`

**Interfaces:**
- Produces: Single lightweight container (~60MB RAM) serving static frontend and WebSocket backend on port 3000 connected to `perinfoan-net`.

- [ ] **Step 1: Create Dockerfile with multi-stage build**

```dockerfile
# projects/uno-game/Dockerfile
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

- [ ] **Step 2: Create docker-compose.yml for perinfoan-net deployment**

```yaml
version: '3.8'

services:
  uno-game:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: perinfoan-uno-game
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    networks:
      - perinfoan-net

networks:
  perinfoan-net:
    external: true
```

- [ ] **Step 3: Write projects/uno-game/README.md with local running and deployment instructions**
- [ ] **Step 4: Commit**

```bash
git add projects/uno-game/Dockerfile projects/uno-game/docker-compose.yml projects/uno-game/README.md
git commit -m "ci(uno): configure multi-stage Docker build, docker-compose, and documentation"
```

---

### Task 15: Full Integration & Multi-Client E2E Simulation Verification

**Files:**
- Create: `projects/uno-game/packages/server/tests/e2eSimulation.test.ts`
- Modify: `README.md` (root README status update if appropriate)

**Interfaces:**
- Produces: Automated headless multi-client simulation script running 3 players through 10 rounds of valid moves and UNO calls, verifying no desyncs.

- [ ] **Step 1: Write multi-client simulation test in e2eSimulation.test.ts**

Launch 3 simulated Socket.io clients, connect to a newly created room, start the game, have players play valid cards or draw in sequence, assert topCard changes and turn indices rotate accurately without server exceptions.

- [ ] **Step 2: Run all workspace test suites**

Run: `cd projects/uno-game && npm test`
Expected: ALL test suites across `@uno/shared`, `@uno/server`, and `@uno/client` PASS.

- [ ] **Step 3: Run full workspace production build**

Run: `cd projects/uno-game && npm run build`
Expected: All packages compile cleanly into `dist/`.

- [ ] **Step 4: Final commit**

```bash
git add projects/uno-game/
git commit -m "test(uno): add headless multi-client simulation test and verify all packages pass"
```
