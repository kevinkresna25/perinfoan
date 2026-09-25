import React from 'react';
import { CardColor } from '@uno/shared';
import { motion } from 'framer-motion';

interface ColorPickerProps {
  isOpen: boolean;
  onSelectColor: (color: CardColor) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ isOpen, onSelectColor }) => {
  if (!isOpen) return null;

  const colors: { name: CardColor; bg: string; label: string }[] = [
    { name: 'red', bg: 'bg-red-600 hover:bg-red-500', label: 'Red' },
    { name: 'blue', bg: 'bg-blue-600 hover:bg-blue-500', label: 'Blue' },
    { name: 'green', bg: 'bg-emerald-600 hover:bg-emerald-500', label: 'Green' },
    { name: 'yellow', bg: 'bg-yellow-400 hover:bg-yellow-300 text-stone-900', label: 'Yellow' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-stone-900 border-2 border-stone-700 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl"
      >
        <h3 className="text-xl font-black text-stone-100 mb-2">Choose Wild Color</h3>
        <p className="text-xs text-stone-400 mb-6">Select the active color for the next player</p>

        <div className="grid grid-cols-2 gap-4">
          {colors.map((c) => (
            <motion.button
              key={c.name}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => onSelectColor(c.name)}
              className={`h-24 rounded-2xl ${c.bg} font-black text-lg tracking-wide uppercase shadow-lg flex items-center justify-center transition-all cursor-pointer`}
            >
              {c.label}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
