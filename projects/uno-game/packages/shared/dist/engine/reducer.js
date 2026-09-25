import { canPlayCard } from './rules.js';
import { shuffleDeck } from './deck.js';
export function nextTurnIndex(currentIndex, playerCount, step, direction) {
    const delta = step * direction;
    return (currentIndex + delta % playerCount + playerCount) % playerCount;
}
export function ensureDrawCards(state, count) {
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
export function applyCardPlay(state, playerId, cardId, chosenColor) {
    const playerIndex = state.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1)
        throw new Error('Player not found in room');
    if (playerIndex !== state.activePlayerIndex)
        throw new Error('Not your turn');
    const player = state.players[playerIndex];
    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1)
        throw new Error('Card not in hand');
    const card = player.hand[cardIndex];
    if (!canPlayCard(card, state.topCard, state.activeColor)) {
        throw new Error('Illegal card play');
    }
    const newHand = [...player.hand];
    newHand.splice(cardIndex, 1);
    let newDirection = state.direction;
    let turnStep = 1;
    const activeColor = card.color === 'wild' ? (chosenColor || 'red') : card.color;
    let intermediateState = {
        ...state,
        topCard: card,
        activeColor,
        discardPile: [...state.discardPile, card]
    };
    if (card.type === 'reverse') {
        if (state.players.length === 2) {
            // In 2-player game, reverse acts as a Skip
            turnStep = 2;
        }
        else {
            newDirection = (newDirection * -1);
        }
    }
    else if (card.type === 'skip') {
        turnStep = 2;
    }
    else if (card.type === 'draw2') {
        turnStep = 2;
        const targetIdx = nextTurnIndex(playerIndex, state.players.length, 1, newDirection);
        const { cards, newState } = ensureDrawCards(intermediateState, 2);
        intermediateState = newState;
        const targetHand = [...intermediateState.players[targetIdx].hand, ...cards];
        intermediateState.players[targetIdx] = {
            ...intermediateState.players[targetIdx],
            hand: targetHand,
            cardsCount: targetHand.length
        };
    }
    else if (card.type === 'wild_draw4') {
        turnStep = 2;
        const targetIdx = nextTurnIndex(playerIndex, state.players.length, 1, newDirection);
        const { cards, newState } = ensureDrawCards(intermediateState, 4);
        intermediateState = newState;
        const targetHand = [...intermediateState.players[targetIdx].hand, ...cards];
        intermediateState.players[targetIdx] = {
            ...intermediateState.players[targetIdx],
            hand: targetHand,
            cardsCount: targetHand.length
        };
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
export function applyDraw(state, playerId) {
    const playerIndex = state.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1)
        throw new Error('Player not found in room');
    if (playerIndex !== state.activePlayerIndex)
        throw new Error('Not your turn');
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
//# sourceMappingURL=reducer.js.map