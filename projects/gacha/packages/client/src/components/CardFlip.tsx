import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { Card } from '../types';

interface CardFlipProps {
  card: Card;
  isNew?: boolean;
  revealed?: boolean;
  onReveal?: () => void;
}

export const CardFlip: React.FC<CardFlipProps> = ({ card, isNew, revealed = false, onReveal }) => {
  const [isFlipped, setIsFlipped] = useState(revealed);

  const flipped = revealed || isFlipped;

  const handleClick = () => {
    if (!flipped) {
      setIsFlipped(true);
      onReveal?.();
    }
  };

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer perspective-1000 w-full max-w-[240px] aspect-[2/3] mx-auto select-none"
    >
      <motion.div
        className="w-full h-full relative transform-style-preserve-3d transition-transform duration-700 shadow-2xl rounded-2xl"
        animate={{ rotateY: flipped ? 180 : 0 }}
      >
        {/* Card Back (Facedown) */}
        <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-2 border-indigo-500/40 rounded-2xl flex flex-col items-center justify-center p-4 overflow-hidden group">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent group-hover:opacity-100 transition-opacity" />
          <div className="w-16 h-16 rounded-full border border-indigo-400/30 flex items-center justify-center mb-3">
            <span className="text-3xl animate-pulse">✨</span>
          </div>
          <span className="text-xs uppercase tracking-widest text-indigo-300/80 font-bold">Tap to Reveal</span>
        </div>

        {/* Card Front (Faceup) */}
        <div
          className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl overflow-hidden border-2 bg-slate-900 flex flex-col"
          style={{ borderColor: card.rarity.color, boxShadow: `0 0 20px ${card.rarity.color}33` }}
        >
          {isNew && (
            <div className="absolute top-2 left-2 z-10 bg-amber-500 text-slate-950 font-black text-[10px] tracking-wider px-2 py-0.5 rounded shadow-lg uppercase">
              NEW!
            </div>
          )}

          <div
            className="absolute top-2 right-2 z-10 px-2.5 py-0.5 rounded-full font-bold text-xs shadow-md"
            style={{ backgroundColor: card.rarity.color, color: '#0f172a' }}
          >
            {card.rarity.name}
          </div>

          <div className="relative flex-1 bg-slate-950 overflow-hidden">
            <img
              src={card.image_url}
              alt={card.name}
              className="w-full h-full object-cover object-center"
              loading="lazy"
            />
          </div>

          <div className="p-3 bg-slate-900/95 border-t border-slate-800">
            <h3 className="font-bold text-sm text-slate-100 truncate">{card.name}</h3>
            {card.description && (
              <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">{card.description}</p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
