import { GameRoom } from './GameRoom.js';
export declare class RoomManager {
    private rooms;
    private cleanupInterval;
    constructor();
    createRoom(hostName: string, turnTimeLimit?: number, hostPlayerId?: string, hostSocketId?: string): GameRoom;
    getRoom(roomId: string): GameRoom | undefined;
    deleteRoom(roomId: string): void;
    cleanupInactiveRooms(maxInactiveMs?: number): void;
    destroy(): void;
    private generateRoomCode;
}
//# sourceMappingURL=RoomManager.d.ts.map