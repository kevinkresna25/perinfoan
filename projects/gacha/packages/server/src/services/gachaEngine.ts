import type { RarityWithCards, RollResult, Card } from '../types/index.js';

export function performPull(
  count: 1 | 10,
  rarities: RarityWithCards[],
  randomFn: () => number = Math.random
): RollResult[] {
  const tiersWithCards = rarities
    .filter((r) => r.cards.length > 0)
    .sort((a, b) => b.sort_order - a.sort_order);

  if (tiersWithCards.length === 0) {
    throw new Error('Gacha pool is empty. No cards are available to pull.');
  }

  // Calculate sum of drop rates across all tiers (or fallback to equal weights if sum is 0)
  const totalWeight = rarities.reduce((acc, r) => acc + (Number(r.drop_rate) || 0), 0);
  const normalizedRarities = rarities.map((r) => ({
    ...r,
    normalizedWeight: totalWeight > 0 ? (Number(r.drop_rate) / totalWeight) * 100 : 100 / rarities.length,
  }));

  const rollSingle = (forceMinSortOrder?: number): RollResult => {
    let poolForRoll = tiersWithCards;
    if (typeof forceMinSortOrder === 'number') {
      const filtered = tiersWithCards.filter((t) => t.sort_order >= forceMinSortOrder);
      if (filtered.length > 0) {
        poolForRoll = filtered;
      }
    }

    const rollVal = randomFn() * 100; // 0 to 100
    let cumulative = 0;
    let selectedTier: RarityWithCards | null = null;

    for (const tier of normalizedRarities) {
      cumulative += tier.normalizedWeight;
      if (rollVal < cumulative) {
        // If this tier has cards, use it
        if (tier.cards.length > 0) {
          selectedTier = tier;
        } else {
          // Fallback to highest tier that has cards
          selectedTier = poolForRoll[0];
        }
        break;
      }
    }

    if (!selectedTier) {
      selectedTier = poolForRoll[poolForRoll.length - 1];
    }

    // Pick uniform random card from selected tier
    const cardIndex = Math.floor(randomFn() * selectedTier.cards.length);
    const card: Card = selectedTier.cards[cardIndex];

    return {
      id: card.id,
      name: card.name,
      rarity: {
        id: selectedTier.id,
        name: selectedTier.name,
        color: selectedTier.color,
      },
      image_url: `/uploads/cards/${card.image_path}`,
      description: card.description,
    };
  };

  const results: RollResult[] = [];
  for (let i = 0; i < count; i++) {
    results.push(rollSingle());
  }

  // For 10-pull: guarantee at least one card of sort_order >= 1 if available
  if (count === 10) {
    const hasGuaranteed = results.some((r) => {
      const match = rarities.find((tier) => tier.id === r.rarity.id);
      return match && match.sort_order >= 1;
    });

    if (!hasGuaranteed) {
      results[9] = rollSingle(1);
    }
  }

  return results;
}
