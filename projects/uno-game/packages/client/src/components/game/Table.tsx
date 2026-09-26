import React from 'react';
import { Card, CardColor, Direction } from '@uno/shared';
import { UnoCard } from '../card/UnoCard';
import { motion } from 'framer-motion';

interface TableProps {
  topCard: Card;
  activeColor: CardColor;
  direction: Direction;
  drawPileCount: number;
  customImages: Record<string, string>;
  isMyTurn: boolean;
  onDrawCard: () => void;
  actionLog?: { text: string; type: string } | null;
}

export const Table: React.FC<TableProps> = ({
  topCard,
  activeColor,
  direction,
  drawPileCount,
  customImages,
  isMyTurn,
  onDrawCard,
  actionLog,
}) => {
  const activeColorBadge = {
    red: 'bg-red-600',
    blue: 'bg-blue-600',
    green: 'bg-emerald-600',
    yellow: 'bg-yellow-400 text-stone-900',
    wild: 'bg-stone-800',
  }[activeColor];

  // Stable deterministic tilt based on top card id so card doesn't jitter on timer ticks
  const cardTilt = (topCard.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 9) - 4;

  return (
    <div className="relative w-full max-w-2xl h-64 md:h-80 rounded-3xl bg-emerald-950/80 border-4 border-emerald-800 shadow-2xl flex flex-col items-center justify-center p-4">
      {/* Toast Alert Banner */}
      {actionLog && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="absolute top-3 px-4 py-1.5 rounded-full bg-stone-900/90 text-yellow-300 font-semibold text-xs md:text-sm border border-yellow-500/40 shadow-lg z-20"
        >
          {actionLog.text}
        </motion.div>
      )}

      {/* Direction & Active Color Indicators */}
      <div className="flex items-center gap-3 mb-4 z-10">
        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow ${activeColorBadge}`}>
          Active: {activeColor}
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-900/80 text-xs font-medium text-stone-300 border border-stone-700">
          <span>Direction:</span>
          <span className="text-yellow-400 font-bold">{direction === 1 ? 'Clockwise ↻' : 'Counter-Clockwise ↺'}</span>
        </div>
      </div>

      {/* Card Piles */}
      <div className="flex items-center gap-8 md:gap-12">
        {/* Draw Pile */}
        <div className="flex flex-col items-center">
          <motion.div
            whileHover={isMyTurn ? { scale: 1.05 } : {}}
            whileTap={isMyTurn ? { scale: 0.95 } : {}}
            onClick={isMyTurn ? onDrawCard : undefined}
            className={`relative ${isMyTurn ? 'cursor-pointer ring-4 ring-yellow-400 ring-offset-2 ring-offset-emerald-950 rounded-xl' : 'cursor-not-allowed opacity-80'}`}
          >
            <UnoCard
              card={{ id: 'draw-card', color: 'red', type: 'number', value: 0 }}
              isBack={true}
              customImage={customImages['card_back']}
              size="md"
            />
            <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-stone-900 border border-stone-700 text-xs font-bold text-yellow-400">
              {drawPileCount}
            </span>
          </motion.div>
          <span className="text-xs text-stone-400 mt-2 font-medium">Draw Pile</span>
        </div>

        {/* Discard Pile (Top Card) */}
        <div className="flex flex-col items-center">
          <motion.div
            key={topCard.id}
            initial={{ scale: 0.8, rotate: cardTilt * 1.5 }}
            animate={{ scale: 1, rotate: cardTilt }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <UnoCard
              card={topCard}
              customImage={customImages[topCard.type] || customImages[topCard.id]}
              size="md"
            />
          </motion.div>
          <span className="text-xs text-stone-400 mt-2 font-medium">Discard Pile</span>
        </div>
      </div>
    </div>
  );
};
