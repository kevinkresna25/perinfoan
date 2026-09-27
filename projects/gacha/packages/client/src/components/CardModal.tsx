import React, { useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { getContrastTextColor } from '../utils/contrast';
import type { Card, InventoryItem } from '../types';

interface CardModalProps {
  card: Card;
  inventoryItem?: InventoryItem;
  onClose: () => void;
}

export const CardModal: React.FC<CardModalProps> = ({ card, inventoryItem, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      data-testid="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 bg-slate-950/60 hover:bg-slate-950 text-white p-2 rounded-full backdrop-blur-sm"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative aspect-[4/5] w-full bg-slate-950">
          <img src={card.image_url} alt={card.name} className="w-full h-full object-contain" />
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-bold"
              style={{ backgroundColor: card.rarity.color, color: getContrastTextColor(card.rarity.color) }}
            >
              {card.rarity.name}
            </span>
            {inventoryItem && (
              <span className="text-xs font-semibold text-slate-400">
                Copies Pulled: <strong className="text-slate-200">x{inventoryItem.count}</strong>
              </span>
            )}
          </div>

          <h2 className="text-xl font-bold text-slate-100 mb-2">{card.name}</h2>
          <p className="text-sm text-slate-300 leading-relaxed mb-4">
            {card.description || 'No lore recorded for this PERINFOAN card.'}
          </p>

          {inventoryItem && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-3 border-t border-slate-800">
              <Calendar className="w-3.5 h-3.5" />
              <span>Discovered on {new Date(inventoryItem.firstPulledAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
