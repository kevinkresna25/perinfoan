import React from 'react';
import { motion } from 'framer-motion';

interface UnoButtonProps {
  canCall: boolean;
  hasCalled: boolean;
  onCallUno: () => void;
}

export const UnoButton: React.FC<UnoButtonProps> = ({ canCall, hasCalled, onCallUno }) => {
  return (
    <motion.button
      type="button"
      whileHover={canCall && !hasCalled ? { scale: 1.1 } : {}}
      whileTap={canCall && !hasCalled ? { scale: 0.9 } : {}}
      onClick={canCall && !hasCalled ? onCallUno : undefined}
      disabled={!canCall || hasCalled}
      className={`
        px-6 py-3 rounded-full font-black text-xl italic tracking-wider uppercase shadow-2xl transition-all
        ${hasCalled
          ? 'bg-emerald-600 text-white ring-4 ring-emerald-400 cursor-default'
          : canCall
          ? 'bg-red-600 text-yellow-300 ring-4 ring-yellow-400 animate-pulse cursor-pointer hover:bg-red-500'
          : 'bg-stone-800 text-stone-500 cursor-not-allowed opacity-60'}
      `}
    >
      {hasCalled ? 'UNO! CALLED ✓' : 'CALL UNO!'}
    </motion.button>
  );
};
