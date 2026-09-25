import { Card, CardColor, MasterGameState, Player } from '@uno/shared';
export declare class GameRoom {
    id: string;
    state: MasterGameState;
    lastActivityAt: number;
    private timerInterval;
    onStateChange?: () => void;
    onMessage?: (text: string, type: 'info' | 'alert' | 'win') => void;
    constructor(id: string, hostName: string, hostPlayerId: string, hostSocketId: string, turnTimeLimit?: number);
    get players(): (Player & {
        hand: Card[];
    })[];
    addPlayer(name: string, playerId: string, socketId: string): Player;
    removePlayer(playerId: string): void;
    start(): void;
    playCard(playerId: string, cardId: string, chosenColor?: CardColor): void;
    drawCard(playerId: string): void;
    callUno(playerId: string): boolean;
    catchUno(callerId: string, targetId: string): boolean;
    setCustomImage(slot: string, url: string): void;
    private startTurnTimer;
    stopTurnTimer(): void;
    destroy(): void;
}
//# sourceMappingURL=GameRoom.d.ts.map