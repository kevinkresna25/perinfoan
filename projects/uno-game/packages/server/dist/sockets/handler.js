import { maskStateForPlayer } from '../utils/stateMask.js';
export function setupSocketHandlers(io, roomManager) {
    function broadcastRoomState(roomId) {
        const room = roomManager.getRoom(roomId);
        if (!room)
            return;
        for (const player of room.players) {
            if (player.isConnected && player.socketId) {
                const maskedState = maskStateForPlayer(room.state, player.id);
                io.to(player.socketId).emit('game:sync', maskedState);
            }
        }
    }
    io.on('connection', (socket) => {
        let currentRoomId = null;
        let currentPlayerId = null;
        socket.on('room:create', (payload, callback) => {
            try {
                const playerId = socket.handshake.query.playerId || `player_${socket.id.slice(0, 6)}`;
                const room = roomManager.createRoom(payload.hostName || 'Host', payload.turnTimeLimit || 30, playerId, socket.id);
                currentRoomId = room.id;
                currentPlayerId = playerId;
                socket.join(room.id);
                room.onStateChange = () => {
                    broadcastRoomState(room.id);
                };
                room.onMessage = (text, type) => {
                    io.to(room.id).emit('game:action_feed', { text, type });
                };
                if (callback) {
                    callback({ success: true, roomId: room.id, playerId });
                }
                broadcastRoomState(room.id);
            }
            catch (err) {
                if (callback)
                    callback({ success: false, error: err.message });
            }
        });
        socket.on('room:join', (payload, callback) => {
            try {
                const room = roomManager.getRoom(payload.roomId);
                if (!room) {
                    if (callback)
                        callback({ success: false, error: 'Room not found' });
                    return;
                }
                const playerId = payload.playerId || socket.handshake.query.playerId || `player_${socket.id.slice(0, 6)}`;
                room.addPlayer(payload.playerName || 'Player', playerId, socket.id);
                currentRoomId = room.id;
                currentPlayerId = playerId;
                socket.join(room.id);
                room.onStateChange = () => {
                    broadcastRoomState(room.id);
                };
                room.onMessage = (text, type) => {
                    io.to(room.id).emit('game:action_feed', { text, type });
                };
                if (callback) {
                    callback({ success: true, roomId: room.id, playerId });
                }
                broadcastRoomState(room.id);
            }
            catch (err) {
                if (callback)
                    callback({ success: false, error: err.message });
            }
        });
        socket.on('game:start', (_, callback) => {
            if (!currentRoomId || !currentPlayerId)
                return;
            const room = roomManager.getRoom(currentRoomId);
            if (!room)
                return;
            const player = room.players.find(p => p.id === currentPlayerId);
            if (!player?.isHost) {
                socket.emit('game:error', { code: 'NOT_HOST', message: 'Only host can start game' });
                if (callback)
                    callback({ success: false, error: 'Only host can start game' });
                return;
            }
            try {
                room.start();
                broadcastRoomState(room.id);
                if (callback)
                    callback({ success: true });
            }
            catch (err) {
                socket.emit('game:error', { code: 'START_ERROR', message: err.message });
                if (callback)
                    callback({ success: false, error: err.message });
            }
        });
        socket.on('game:play_card', (payload) => {
            if (!currentRoomId || !currentPlayerId)
                return;
            const room = roomManager.getRoom(currentRoomId);
            if (!room)
                return;
            try {
                room.playCard(currentPlayerId, payload.cardId, payload.chosenColor);
                broadcastRoomState(room.id);
            }
            catch (err) {
                socket.emit('game:error', { code: 'INVALID_PLAY', message: err.message });
            }
        });
        socket.on('game:draw_card', () => {
            if (!currentRoomId || !currentPlayerId)
                return;
            const room = roomManager.getRoom(currentRoomId);
            if (!room)
                return;
            try {
                room.drawCard(currentPlayerId);
                broadcastRoomState(room.id);
            }
            catch (err) {
                socket.emit('game:error', { code: 'INVALID_DRAW', message: err.message });
            }
        });
        socket.on('game:call_uno', () => {
            if (!currentRoomId || !currentPlayerId)
                return;
            const room = roomManager.getRoom(currentRoomId);
            if (!room)
                return;
            room.callUno(currentPlayerId);
            broadcastRoomState(room.id);
        });
        socket.on('game:catch_uno', (payload) => {
            if (!currentRoomId || !currentPlayerId)
                return;
            const room = roomManager.getRoom(currentRoomId);
            if (!room)
                return;
            room.catchUno(currentPlayerId, payload.targetPlayerId);
            broadcastRoomState(room.id);
        });
        socket.on('disconnect', () => {
            if (currentRoomId && currentPlayerId) {
                const room = roomManager.getRoom(currentRoomId);
                if (room) {
                    room.removePlayer(currentPlayerId);
                    broadcastRoomState(room.id);
                }
            }
        });
    });
}
//# sourceMappingURL=handler.js.map