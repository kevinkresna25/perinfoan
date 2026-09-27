import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { fetchRates } from '../services/api';
import type { Rarity } from '../types';

interface RatesModalProps {
  onClose: () => void;
}

export const RatesModal: React.FC<RatesModalProps> = ({ onClose }) => {
  const [rarities, setRarities] = useState<Rarity[]>([]);
  const [totalCards, setTotalCards] = useState(0);

  useEffect(() => {
    fetchRates().then((data) => {
      setRarities(data.rarities);
      setTotalCards(data.total_cards);
    });
  }, []);

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
      data-testid="rates-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-slate-100 mb-1">Summon Odds & Details</h3>
        <p className="text-xs text-slate-400 mb-4">Total cards in pool: {totalCards}</p>

        <div className="space-y-3">
          {rarities.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/40">
              <div className="flex items-center gap-2.5">
                <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: r.color }} />
                <span className="font-bold text-sm text-slate-200">{r.name}</span>
                <span className="text-xs text-slate-400">({r.card_count || 0} cards)</span>
              </div>
              <span className="font-mono text-sm font-semibold" style={{ color: r.color }}>
                {Number(r.drop_rate).toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
