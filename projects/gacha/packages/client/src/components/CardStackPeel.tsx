import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, FastForward, CheckCircle2, ChevronRight, ArrowRight } from 'lucide-react';
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
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [revealedCards, setRevealedCards] = useState<Card[]>([]);

  const isFinished = currentIndex >= cards.length;
  const currentCard = !isFinished ? cards[currentIndex] : null;
  const nextCard = currentIndex + 1 < cards.length ? cards[currentIndex + 1] : null;

  // Reveal current card face-up first
  const handleRevealCard = () => {
    setIsCardFlipped(true);
  };

  // Place current card under "PEELED CARDS" and advance to next card
  const handleNext = () => {
    if (!currentCard) return;
    setRevealedCards((prev) => [...prev, currentCard]);
    setIsCardFlipped(false);
    const nextIdx = currentIndex + 1;
    setCurrentIndex(nextIdx);
    if (nextIdx >= cards.length) {
      onComplete();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[520px] w-full max-w-4xl mx-auto px-4 py-6 select-none">
      {/* Top Header / Progress */}
      <div className="w-full max-w-md flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-extrabold tracking-wider text-purple-400">
            {isFinished ? 'All Cards Revealed!' : `Card ${currentIndex + 1} of ${cards.length}`}
          </span>
          {isCardFlipped && currentCard && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: currentCard.rarity.color, color: '#0f172a' }}
            >
              {currentCard.rarity.name}
            </span>
          )}
        </div>

        <button
          onClick={onSkip}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
        >
          <FastForward className="w-3.5 h-3.5" /> Reveal All
        </button>
      </div>

      {/* Main Card Stage */}
      <div className="relative w-full max-w-xs aspect-[2/3] flex items-center justify-center mb-6">
        {/* Underneath Card Peek Glow */}
        {nextCard && (
          <div
            className="absolute inset-0 rounded-2xl blur-xl opacity-60 scale-95 transition-all duration-300 pointer-events-none"
            style={{ backgroundColor: nextCard.rarity.color }}
          />
        )}

        <AnimatePresence mode="popLayout">
          {!isFinished && currentCard ? (
            <motion.div
              key={currentCard.id + '-' + currentIndex}
              className="w-full h-full relative cursor-pointer"
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ y: 80, scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.35 }}
              drag={isCardFlipped ? 'x' : false}
              dragConstraints={{ left: -100, right: 100 }}
              onDragEnd={(_e, info) => {
                if (Math.abs(info.offset.x) > 50) {
                  handleNext();
                }
              }}
            >
              <CardFlip
                card={currentCard}
                isNew={newCardIds.has(currentCard.id)}
                revealed={isCardFlipped}
                onReveal={handleRevealCard}
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
                className="px-6 py-2.5 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white text-sm shadow-lg flex items-center gap-2 cursor-pointer"
              >
                View Summary <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control Buttons */}
      {!isFinished && (
        <div className="flex items-center gap-3">
          {!isCardFlipped ? (
            <button
              onClick={handleRevealCard}
              className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm shadow-xl active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Eye className="w-4 h-4" /> Tap to Reveal Card ({currentIndex + 1}/{cards.length})
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-3 rounded-xl font-black bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white text-sm shadow-xl shadow-purple-900/40 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              {currentIndex + 1 < cards.length ? (
                <>
                  Next Card ({currentIndex + 2}/{cards.length}) <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  View All Cards <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      )}

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
