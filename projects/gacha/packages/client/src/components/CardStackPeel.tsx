import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, FastForward, CheckCircle2, ChevronRight } from 'lucide-react';
import { CardFlip } from './CardFlip';
import type { Card } from '../types';

interface CardStackPeelProps {
  cards: Card[];
  newCardIds: Set<string>;
  onComplete: () => void;
  onSkip: () => void;
}

export const CardStackPeel: React.FC<CardStackPeelProps> = ({
  cards,
  newCardIds,
  onComplete,
  onSkip,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealedCards, setRevealedCards] = useState<Card[]>([]);

  const isLastCard = currentIndex >= cards.length;
  const currentCard = !isLastCard ? cards[currentIndex] : null;
  const nextCard = currentIndex + 1 < cards.length ? cards[currentIndex + 1] : null;

  const handlePeel = () => {
    if (isLastCard || !currentCard) return;
    setRevealedCards((prev) => [...prev, currentCard]);
    setCurrentIndex((prev) => prev + 1);
  };

  const allRevealed = currentIndex >= cards.length;

  return (
    <div className="flex flex-col items-center justify-center min-h-[520px] w-full max-w-4xl mx-auto px-4 py-6 select-none">
      {/* Top Header / Progress */}
      <div className="w-full max-w-md flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-extrabold tracking-wider text-purple-400">
            {allRevealed ? 'All Cards Revealed!' : `Card ${currentIndex + 1} of ${cards.length}`}
          </span>
        </div>

        <button
          onClick={onSkip}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5"
        >
          <FastForward className="w-3.5 h-3.5" /> Reveal All
        </button>
      </div>

      {/* Main Peeling Stage */}
      <div className="relative w-full max-w-xs aspect-[2/3] flex items-center justify-center mb-6">
        {/* Underneath Card Peek Glow */}
        {nextCard && (
          <div
            className="absolute inset-0 rounded-2xl blur-xl opacity-50 scale-95 transition-all duration-300"
            style={{ backgroundColor: nextCard.rarity.color }}
          />
        )}

        <AnimatePresence mode="popLayout">
          {!allRevealed && currentCard ? (
            <motion.div
              key={currentCard.id + '-' + currentIndex}
              className="w-full h-full relative cursor-grab active:cursor-grabbing"
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ x: 300, rotate: 20, opacity: 0 }}
              transition={{ duration: 0.4 }}
              drag="x"
              dragConstraints={{ left: -100, right: 100 }}
              onDragEnd={(_e, info) => {
                if (Math.abs(info.offset.x) > 60) {
                  handlePeel();
                }
              }}
            >
              <CardFlip
                card={currentCard}
                isNew={newCardIds.has(currentCard.id)}
                revealed={false}
                onReveal={handlePeel}
              />
            </motion.div>
          ) : (
            <motion.div
              key="complete-badge"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center p-6 text-center bg-slate-900/80 border border-slate-800 rounded-2xl"
            >
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-3" />
              <h3 className="text-lg font-bold text-slate-100 mb-1">Pack Finished!</h3>
              <p className="text-xs text-slate-400 mb-4">
                You unveiled all {cards.length} cards in this pack.
              </p>
              <button
                onClick={onComplete}
                className="px-6 py-2.5 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white text-sm shadow-lg flex items-center gap-2"
              >
                View Summary <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control Buttons */}
      {!allRevealed ? (
        <div className="flex items-center gap-3">
          <button
            onClick={handlePeel}
            className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm shadow-xl active:scale-95 transition-all flex items-center gap-2"
          >
            <Eye className="w-4 h-4" /> Peel Card ({currentIndex + 1}/{cards.length})
          </button>
        </div>
      ) : null}

      {/* Recently Peeled Mini Tray */}
      {revealedCards.length > 0 && (
        <div className="w-full max-w-xl mt-8 pt-4 border-t border-slate-800/80">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
            Peeled Cards ({revealedCards.length})
          </div>
          <div className="flex gap-2 justify-center overflow-x-auto py-2">
            {revealedCards.map((c, i) => (
              <div
                key={c.id + '-' + i}
                className="w-14 aspect-[2/3] rounded-lg overflow-hidden border relative shrink-0 shadow bg-slate-900"
                style={{ borderColor: c.rarity.color }}
              >
                <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                <div
                  className="absolute bottom-0 inset-x-0 text-[8px] font-bold text-center py-0.5 truncate"
                  style={{ backgroundColor: c.rarity.color, color: '#0f172a' }}
                >
                  {c.rarity.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
