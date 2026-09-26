import {
  Card,
  CardColor,
  MasterGameState,
  Player,
  createDeck,
  shuffleDeck,
  dealCards,
  applyCardPlay,
  applyDraw,
  ensureDrawCards,
  INITIAL_CARDS_PER_PLAYER,
  UNO_PENALTY_DRAW_COUNT
} from '@uno/shared';

export class GameRoom {
  public id: string;
  public state: MasterGameState;
  public lastActivityAt: number;
  private timerInterval: NodeJS.Timeout | null = null;
  public onStateChange?: () => void;
  public onMessage?: (text: string, type: 'info' | 'alert' | 'win') => void;

  constructor(id: string, hostName: string, hostPlayerId: string, hostSocketId: string, turnTimeLimit: number = 30) {
    this.id = id;
    this.lastActivityAt = Date.now();

    const hostPlayer: Player & { hand: Card[] } = {
      id: hostPlayerId,
      socketId: hostSocketId,
      name: hostName,
      isHost: true,
      cardsCount: 0,
      hand: [],
      hasCalledUno: false,
      isConnected: true,
      lastActiveAt: Date.now()
    };

    this.state = {
      roomId: id,
      status: 'lobby',
      players: [hostPlayer],
      activePlayerIndex: 0,
      direction: 1,
      topCard: { id: 'dummy', color: 'red', type: 'number', value: 0 },
      activeColor: 'red',
      drawPile: [],
      discardPile: [],
      drawPileCount: 0,
      turnTimeLimit,
      turnRemainingSeconds: turnTimeLimit,
      winnerId: null,
      customImages: {}
    };
  }

  public get players(): (Player & { hand: Card[] })[] {
    return this.state.players;
  }

  public addPlayer(name: string, playerId: string, socketId: string): Player {
    this.lastActivityAt = Date.now();
    // Check if player is reconnecting
    const existing = this.state.players.find(p => p.id === playerId);
    if (existing) {
      existing.socketId = socketId;
      existing.isConnected = true;
      existing.lastActiveAt = Date.now();
      return existing;
    }

    if (this.state.status !== 'lobby') {
      throw new Error('Game already in progress');
    }

    if (this.state.players.length >= 8) {
      throw new Error('Room is full (max 8 players)');
    }

    const isFirstPlayer = this.state.players.length === 0;
    const newPlayer: Player & { hand: Card[] } = {
      id: playerId,
      socketId,
      name,
      isHost: isFirstPlayer,
      cardsCount: 0,
      hand: [],
      hasCalledUno: false,
      isConnected: true,
      lastActiveAt: Date.now()
    };

    this.state.players.push(newPlayer);
    return newPlayer;
  }

  public removePlayer(playerId: string): void {
    this.lastActivityAt = Date.now();
    const idx = this.state.players.findIndex(p => p.id === playerId);
    if (idx === -1) return;

    const player = this.state.players[idx];
    if (this.state.status === 'lobby') {
      this.state.players.splice(idx, 1);
      if (player.isHost && this.state.players.length > 0) {
        this.state.players[0].isHost = true;
      }
    } else {
      player.isConnected = false;

      // If only 1 player remains connected during active match, award win to that player
      const connectedPlayers = this.state.players.filter(p => p.isConnected);
      if (this.state.status === 'playing' && connectedPlayers.length === 1 && this.state.players.length > 1) {
        const remainingPlayer = connectedPlayers[0];
        this.state.winnerId = remainingPlayer.id;
        this.state.status = 'ended';
        this.stopTurnTimer();
        if (this.onMessage) {
          this.onMessage(`🏆 All opponents disconnected. ${remainingPlayer.name} wins!`, 'win');
        }
      }
    }
  }

  public start(): void {
    if (this.state.players.length < 2) {
      throw new Error('Need at least 2 players to start game');
    }

    this.lastActivityAt = Date.now();
    const rawDeck = createDeck();
    const shuffled = shuffleDeck(rawDeck);

    const { hands, remainingDeck } = dealCards(
      shuffled,
      this.state.players.length,
      INITIAL_CARDS_PER_PLAYER
    );

    // Initial top card cannot be wild draw 4
    let topCard = remainingDeck.shift()!;
    while (topCard.type === 'wild_draw4') {
      remainingDeck.push(topCard);
      topCard = remainingDeck.shift()!;
    }

    const initialColor = topCard.color === 'wild' ? 'red' : topCard.color;

    this.state.players.forEach((p, i) => {
      p.hand = hands[i];
      p.cardsCount = hands[i].length;
      p.hasCalledUno = false;
    });

    this.state.drawPile = remainingDeck;
    this.state.drawPileCount = remainingDeck.length;
    this.state.discardPile = [topCard];
    this.state.topCard = topCard;
    this.state.activeColor = initialColor;
    this.state.direction = 1;
    this.state.winnerId = null;
    this.state.status = 'playing';
    this.state.activePlayerIndex = 0;
    this.state.turnRemainingSeconds = this.state.turnTimeLimit;

    this.startTurnTimer();
  }

  public playCard(playerId: string, cardId: string, chosenColor?: CardColor): void {
    this.lastActivityAt = Date.now();
    const prevPlayer = this.state.players[this.state.activePlayerIndex];
    this.state = applyCardPlay(this.state, playerId, cardId, chosenColor);

    if (this.onMessage) {
      this.onMessage(`${prevPlayer.name} played a card`, 'info');
    }

    if (this.state.winnerId) {
      this.stopTurnTimer();
      const winner = this.state.players.find(p => p.id === this.state.winnerId);
      if (this.onMessage && winner) {
        this.onMessage(`🎉 ${winner.name} won the match!`, 'win');
      }
    } else {
      this.state.turnRemainingSeconds = this.state.turnTimeLimit;
    }
  }

  public drawCard(playerId: string): void {
    this.lastActivityAt = Date.now();
    const player = this.state.players[this.state.activePlayerIndex];
    this.state = applyDraw(this.state, playerId);
    if (this.onMessage) {
      this.onMessage(`${player.name} drew a card`, 'info');
    }
    this.state.turnRemainingSeconds = this.state.turnTimeLimit;
  }

  public callUno(playerId: string): boolean {
    this.lastActivityAt = Date.now();
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return false;

    const isMyTurn = this.state.players[this.state.activePlayerIndex]?.id === playerId;
    const canCall = player.hand.length === 1 || (player.hand.length === 2 && isMyTurn);

    if (canCall) {
      player.hasCalledUno = true;
      if (this.onMessage) {
        this.onMessage(`🔥 ${player.name} called UNO!`, 'alert');
      }
      return true;
    }
    return false;
  }

  public catchUno(callerId: string, targetId: string): boolean {
    this.lastActivityAt = Date.now();
    const caller = this.state.players.find(p => p.id === callerId);
    const target = this.state.players.find(p => p.id === targetId);
    if (!caller || !target) return false;

    // Caught: has exactly 1 card and has NOT called UNO
    if (target.hand.length === 1 && !target.hasCalledUno) {
      const { cards, newState } = ensureDrawCards(this.state, UNO_PENALTY_DRAW_COUNT);
      this.state = newState;
      const targetPlayer = this.state.players.find(p => p.id === targetId)!;
      targetPlayer.hand.push(...cards);
      targetPlayer.cardsCount = targetPlayer.hand.length;

      if (this.onMessage) {
        this.onMessage(`🚨 ${caller.name} caught ${target.name} without calling UNO! (+2 penalty cards)`, 'alert');
      }
      return true;
    }

    return false;
  }

  public setCustomImage(slot: string, url: string): void {
    this.lastActivityAt = Date.now();
    this.state.customImages[slot] = url;
    if (this.onStateChange) {
      this.onStateChange();
    }
  }

  public returnToLobby(hostPlayerId: string): void {
    const host = this.state.players.find(p => p.id === hostPlayerId);
    if (!host?.isHost) {
      throw new Error('Only host can return to lobby');
    }
    this.stopTurnTimer();
    this.state.status = 'lobby';
    this.state.winnerId = null;
    this.state.direction = 1;
    this.state.drawPile = [];
    this.state.discardPile = [];
    this.state.drawPileCount = 0;
    this.state.players.forEach(p => {
      p.hand = [];
      p.cardsCount = 0;
      p.hasCalledUno = false;
    });
    if (this.onMessage) {
      this.onMessage('Returned to lobby', 'info');
    }
    if (this.onStateChange) {
      this.onStateChange();
    }
  }

  private startTurnTimer(): void {
    this.stopTurnTimer();
    this.timerInterval = setInterval(() => {
      if (this.state.status !== 'playing') {
        this.stopTurnTimer();
        return;
      }

      // If no players are currently connected, pause timer and do not update activity
      const hasConnectedPlayers = this.state.players.some(p => p.isConnected);
      if (!hasConnectedPlayers) {
        return;
      }

      this.state.turnRemainingSeconds -= 1;
      if (this.state.turnRemainingSeconds <= 0) {
        // Timeout: auto-draw for active player
        const activePlayer = this.state.players[this.state.activePlayerIndex];
        try {
          this.drawCard(activePlayer.id);
        } catch {
          // ignore
        }
      }

      if (this.onStateChange) {
        this.onStateChange();
      }
    }, 1000);
  }

  public stopTurnTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  public destroy(): void {
    this.stopTurnTimer();
  }
}
