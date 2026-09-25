import React from 'react';
import { Card, CardColor, canPlayCard } from '@uno/shared';
import { UnoCard } from '../card/UnoCard';

interface HandProps {
  cards: Card[];
  topCard: Card;
  activeColor: CardColor;
  isMyTurn: boolean;
  customImages: Record<string, string>;
  onPlayCard: (card: Card) => void;
}

export const Hand: React.FC<HandProps> = ({
  cards,
  topCard,
  activeColor,
  isMyTurn,
  customImages,
  onPlayCard,
}) => {
  return (
    <div className="w-full max-w-4xl px-2 py-4 flex flex-col items-center">
      <div className="flex items-center justify-center -space-x-4 md:-space-x-6 overflow-x-auto py-6 px-4 max-w-full">
        {cards.map((card, index) => {
          const playable = isMyTurn && canPlayCard(card, topCard, activeColor);
          return (
            <div
              key={card.id || index}
              className="transition-transform hover:z-20 relative"
              style={{ zIndex: index }}
            >
              <UnoCard
                card={card}
                isPlayable={playable}
                customImage={customImages[card.type] || customImages[card.id]}
                size="md"
                onClick={() => onPlayCard(card)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
