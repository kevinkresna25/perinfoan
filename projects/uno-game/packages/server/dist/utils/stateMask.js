export function maskStateForPlayer(masterState, targetPlayerId) {
    const maskedPlayers = masterState.players.map(p => ({
        id: p.id,
        socketId: p.socketId,
        name: p.name,
        isHost: p.isHost,
        cardsCount: p.hand ? p.hand.length : p.cardsCount,
        hasCalledUno: p.hasCalledUno,
        isConnected: p.isConnected,
        lastActiveAt: p.lastActiveAt,
        // ONLY provide hand if this is the target player:
        hand: p.id === targetPlayerId ? p.hand : undefined
    }));
    const { drawPile, discardPile, ...safeState } = masterState;
    return {
        ...safeState,
        players: maskedPlayers,
        drawPileCount: drawPile ? drawPile.length : masterState.drawPileCount
    };
}
//# sourceMappingURL=stateMask.js.map