import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Scissors, FastForward } from 'lucide-react';

interface BoosterPackProps {
  count: number;
  highestRarityColor?: string;
  onTear: () => void;
  onSkip?: () => void;
}

export const BoosterPack: React.FC<BoosterPackProps> = ({
  count,
  highestRarityColor = '#ffd700',
  onTear,
  onSkip,
}) => {
  const [isTorn, setIsTorn] = useState(false);

  const handleRip = () => {
    if (isTorn) return;
    setIsTorn(true);
    setTimeout(() => {
      onTear();
    }, 650);
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[500px] w-full max-w-sm mx-auto px-4 py-8 select-none">
      {/* Pack Container with 3D perspective */}
      <div className="relative w-64 sm:w-72 aspect-[1/1.6] flex flex-col items-center justify-center">
        {/* Glow behind the pack */}
        <div
          className="absolute inset-0 rounded-3xl blur-2xl opacity-40 animate-pulse pointer-events-none"
          style={{ backgroundColor: highestRarityColor }}
        />

        {/* The Foil Booster Pack */}
        <motion.div
          className="relative w-full h-full rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-indigo-400/30"
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #1e1b4b 70%, #4338ca 100%)',
            boxShadow: `0 20px 40px -10px ${highestRarityColor}44, 0 0 20px rgba(99, 102, 241, 0.3)`,
          }}
        >
          {/* Foil Holographic Sheen overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />

          {/* Top Crimped Foil Edge */}
          <div className="relative h-6 w-full bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400 border-b border-slate-500/50 flex items-center justify-around opacity-90 overflow-hidden">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="w-1 h-full bg-slate-500/30 skew-x-12" />
            ))}
          </div>

          {/* Top Tearable Strip */}
          <AnimatePresence>
            {!isTorn ? (
              <motion.div
                className="relative bg-gradient-to-b from-indigo-900 to-slate-900 px-4 py-3 border-b-2 border-dashed border-amber-400/80 flex items-center justify-between cursor-pointer group"
                onClick={handleRip}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs tracking-wider">
                  <Scissors className="w-4 h-4 text-amber-400 animate-pulse group-hover:rotate-12 transition-transform" />
                  <span>TEAR HERE TO OPEN</span>
                </div>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-amber-500 text-slate-950 shadow">
                  BREWEK
                </span>
              </motion.div>
            ) : (
              <motion.div
                initial={{ rotate: 0, x: 0, y: 0, opacity: 1 }}
                animate={{ rotate: -25, x: -80, y: -40, opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeIn' }}
                className="relative bg-gradient-to-b from-indigo-900 to-slate-900 px-4 py-3 border-b-2 border-dashed border-amber-400/80 flex items-center justify-between pointer-events-none"
              >
                <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs tracking-wider">
                  <Scissors className="w-4 h-4 text-amber-400" />
                  <span>RIPPED!</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pack Center Graphics */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
            {/* Background radiant starburst */}
            <div className="absolute w-44 h-44 rounded-full border border-purple-400/20 animate-[spin_40s_linear_infinite]" />
            <div className="absolute w-32 h-32 rounded-full border border-pink-400/20 animate-[spin_20s_linear_reverse_infinite]" />

            <div className="relative mb-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Sparkles className="w-9 h-9 text-white animate-bounce" />
              </div>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-pink-300 to-purple-300 tracking-wider">
              PERINFOAN BOOSTER
            </h3>
            <p className="text-xs uppercase font-extrabold tracking-widest text-indigo-300 mt-1">
              LIMITED EDITION
            </p>

            <div className="mt-4 px-3 py-1 rounded-full bg-slate-950/60 border border-indigo-400/30 text-[11px] font-bold text-slate-300">
              {count} {count === 1 ? 'CARD' : 'CARDS'} INSIDE
            </div>
          </div>

          {/* Bottom Crimped Foil Edge */}
          <div className="relative h-6 w-full bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400 border-t border-slate-500/50 flex items-center justify-around opacity-90 overflow-hidden">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="w-1 h-full bg-slate-500/30 -skew-x-12" />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Action Controls */}
      <div className="mt-6 flex flex-col items-center gap-3 w-full max-w-xs">
        <button
          onClick={handleRip}
          disabled={isTorn}
          className="w-full py-3.5 px-6 rounded-xl font-black text-sm tracking-wider uppercase bg-gradient-to-r from-amber-500 via-orange-500 to-pink-600 hover:from-amber-400 hover:to-pink-500 text-slate-950 shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Scissors className="w-4 h-4 text-slate-950" />
          Brewek Pack (Rip Open!)
        </button>

        {onSkip && (
          <button
            onClick={onSkip}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 py-1 px-3 cursor-pointer"
          >
            <FastForward className="w-3.5 h-3.5" /> Skip to Reveal All
          </button>
        )}
      </div>
    </div>
  );
};
