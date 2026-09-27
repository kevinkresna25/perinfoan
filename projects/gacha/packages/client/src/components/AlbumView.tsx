import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchCards, fetchRates } from '../services/api';
import { getLocalInventory } from '../services/inventory';
import { getContrastTextColor } from '../utils/contrast';
import { CardModal } from './CardModal';
import type { Card, Rarity, InventoryItem } from '../types';

export const AlbumView: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [rarities, setRarities] = useState<Rarity[]>([]);
  const [inventory, setInventory] = useState<Record<string, InventoryItem>>({});
  const [selectedRarity, setSelectedRarity] = useState<string>('all');
  const [activeModalCard, setActiveModalCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setInventory(getLocalInventory());
      const [cardsRes, ratesRes] = await Promise.all([fetchCards(), fetchRates()]);
      setCards(cardsRes.cards);
      setRarities(ratesRes.rarities);
    } catch (err: any) {
      setError(err?.message || 'Failed to load card album data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="w-10 h-10 text-purple-400 animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-300">Loading card album...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[300px] text-center">
        <AlertCircle className="w-12 h-12 text-rose-400 mb-3" />
        <h3 className="text-lg font-bold text-slate-100 mb-1">Unable to Load Album</h3>
        <p className="text-sm text-slate-400 max-w-md mb-6">{error}</p>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition-all shadow-lg shadow-purple-600/20"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const discoveredCount = cards.filter((c) => inventory[c.id]).length;
  const completionPercentage = cards.length > 0 ? Math.round((discoveredCount / cards.length) * 100) : 0;

  const filteredCards = cards.filter((c) => {
    if (selectedRarity !== 'all' && c.rarity.id !== selectedRarity) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header & Stats */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Card Album</h2>
          <p className="text-sm text-slate-400 mt-1">
            Collection progress: {discoveredCount} / {cards.length} cards ({completionPercentage}%)
          </p>
        </div>
        <div className="w-full sm:w-48 bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
          <div
            className="bg-gradient-to-r from-purple-500 to-indigo-400 h-full transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Rarity Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedRarity('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
            selectedRarity === 'all'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
          }`}
        >
          All ({cards.length})
        </button>
        {rarities.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedRarity(r.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              selectedRarity === r.id
                ? 'font-bold'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
            style={selectedRarity === r.id ? { backgroundColor: r.color, color: getContrastTextColor(r.color) } : {}}
          >
            {r.name}
          </button>
        ))}
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredCards.map((card) => {
          const invItem = inventory[card.id];
          const isDiscovered = Boolean(invItem);

          return (
            <div
              key={card.id}
              onClick={() => isDiscovered && setActiveModalCard(card)}
              className={`aspect-[2/3] rounded-2xl overflow-hidden border-2 relative flex flex-col ${
                isDiscovered
                  ? 'cursor-pointer hover:scale-[1.02] transition-transform shadow-lg'
                  : 'opacity-40 grayscale border-slate-800 bg-slate-950 select-none'
              }`}
              style={isDiscovered ? { borderColor: card.rarity.color } : {}}
            >
              {isDiscovered ? (
                <>
                  <div
                    className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: card.rarity.color, color: getContrastTextColor(card.rarity.color) }}
                  >
                    {card.rarity.name}
                  </div>
                  <div className="absolute top-2 left-2 z-10 bg-slate-950/80 text-slate-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    x{invItem.count}
                  </div>
                  <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
                  <div className="p-2 bg-slate-900/90 border-t border-slate-800 mt-auto">
                    <p className="text-xs font-bold text-slate-200 truncate">{card.name}</p>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                  <span className="text-3xl text-slate-600 mb-2">?</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.rarity.name}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {activeModalCard && (
        <CardModal
          card={activeModalCard}
          inventoryItem={inventory[activeModalCard.id]}
          onClose={() => setActiveModalCard(null)}
        />
      )}
    </div>
  );
};
