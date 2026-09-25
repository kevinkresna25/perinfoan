import { GameRoom } from './GameRoom.js';
export class RoomManager {
    rooms = new Map();
    cleanupInterval = null;
    constructor() {
        // Run cleanup every 60 seconds
        this.cleanupInterval = setInterval(() => {
            this.cleanupInactiveRooms();
        }, 60000);
    }
    createRoom(hostName, turnTimeLimit = 30, hostPlayerId = 'host-player', hostSocketId = 'host-socket') {
        let roomId = this.generateRoomCode();
        while (this.rooms.has(roomId)) {
            roomId = this.generateRoomCode();
        }
        const room = new GameRoom(roomId, hostName, hostPlayerId, hostSocketId, turnTimeLimit);
        this.rooms.set(roomId, room);
        return room;
    }
    getRoom(roomId) {
        return this.rooms.get(roomId.toUpperCase());
    }
    deleteRoom(roomId) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.destroy();
            this.rooms.delete(roomId);
        }
    }
    cleanupInactiveRooms(maxInactiveMs = 5 * 60 * 1000) {
        const now = Date.now();
        for (const [id, room] of this.rooms.entries()) {
            if (now - room.lastActivityAt > maxInactiveMs) {
                this.deleteRoom(id);
            }
        }
    }
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        for (const room of this.rooms.values()) {
            room.destroy();
        }
        this.rooms.clear();
    }
    generateRoomCode(length = 6) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing 0/O, 1/I
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}
//# sourceMappingURL=RoomManager.js.map