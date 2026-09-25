import { CardColor } from './card.js';
export interface RoomCreatePayload {
    hostName: string;
    turnTimeLimit?: number;
}
export interface RoomJoinPayload {
    roomId: string;
    playerName: string;
    playerId?: string;
}
export interface PlayCardPayload {
    cardId: string;
    chosenColor?: CardColor;
}
export interface CatchUnoPayload {
    targetPlayerId: string;
}
export interface ActionLogPayload {
    text: string;
    type: 'info' | 'alert' | 'win';
}
export interface ErrorPayload {
    code: string;
    message: string;
}
//# sourceMappingURL=events.d.ts.map