export function canPlayCard(card, topCard, activeColor) {
    // Wild cards can always be played
    if (card.color === 'wild')
        return true;
    // Matching active color
    if (card.color === activeColor)
        return true;
    // Matching action type (e.g. skip on skip, reverse on reverse, draw2 on draw2)
    if (card.type === topCard.type && card.type !== 'number')
        return true;
    // Matching number value
    if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value)
        return true;
    return false;
}
//# sourceMappingURL=rules.js.map