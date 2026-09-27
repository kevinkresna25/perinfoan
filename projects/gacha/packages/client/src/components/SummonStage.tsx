import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, RotateCcw, Eye, PackageOpen } from 'lucide-react';
import { CardFlip } from './CardFlip';
import { BoosterPack } from './BoosterPack';
import { CardStackPeel } from './CardStackPeel';
import { pullGacha } from '../services/api';
import { recordPulls, getLocalInventory } from '../services/inventory';
import type { Card } from '../types';

interface SummonStageProps {
  onOpenRates: () => void;
}

type Stage = 'idle' | 'pack_tear' | 'card_peel' | 'summary_grid';

export const SummonStage: React.FC<SummonStageProps> = ({ onOpenRates }) => {
  const [pulling, setPulling] = useState(false);
  const [results, setResults] = useState<Card[]>([]);
  const [newCardIds, setNewCardIds] = useState<Set<string>>(new Set());
  const [revealAll, setRevealAll] = useState(false);
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);

  const handlePull = async (count: 1 | 10) => {
    setError(null);
    setPulling(true);
    setRevealAll(false);
    try {
      const existingInventory = getLocalInventory();
      const res = await pullGacha(count);

      const newlyDiscovered = new Set<string>();
      res.results.forEach((c) => {
        if (!existingInventory[c.id]) {
          newlyDiscovered.add(c.id);
        }
      });

      recordPulls(res.results);
      setNewCardIds(newlyDiscovered);
      setResults(res.results);
      setStage('pack_tear');
    } catch (err: any) {
      setError(err.message || 'Error occurred while pulling.');
      setStage('idle');
    } finally {
      setPulling(false);
    }
  };

  const handleReset = () => {
    setResults([]);
    setRevealAll(false);
    setStage('idle');
    setError(null);
  };

  const highestRarityColor = results.length > 0
    ? results.reduce((best, c) => {
        return c.rarity.name === 'SSR' ? c.rarity.color : best;
      }, results[0]?.rarity?.color || '#ffd700')
    : '#ffd700';

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8">
      {error && (
        <div className="w-full max-w-md bg-rose-500/20 border border-rose-500/40 text-rose-200 px-4 py-3 rounded-xl mb-6 text-sm text-center">
          {error}
        </div>
      )}

      {stage === 'idle' && (
        <div className="text-center max-w-lg">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative w-48 h-48 sm:w-64 sm:h-64 mx-auto mb-8 flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
            <div className="w-full h-full rounded-full border-2 border-dashed border-purple-400/30 flex items-center justify-center animate-[spin_30s_linear_infinite]">
              <div className="w-3/4 h-3/4 rounded-full border border-indigo-400/40" />
            </div>
            <Sparkles className="w-16 h-16 text-purple-400 absolute animate-bounce" />
          </motion.div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 mb-2">
            Summon Celestial Cards
          </h2>
          <p className="text-slate-400 text-sm mb-8">
            Experience the thrill of tearing booster packs! Collect all rarities to complete your album.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => handlePull(1)}
              disabled={pulling}
              className="px-8 py-3.5 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              Summon x1
            </button>
            <button
              onClick={() => handlePull(10)}
              disabled={pulling}
              className="px-8 py-3.5 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-900/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Summon x10
            </button>
          </div>

          <button
            onClick={onOpenRates}
            className="mt-6 text-xs text-slate-500 hover:text-slate-300 underline tracking-wide cursor-pointer"
          >
            View Drop Rates & Odds
          </button>
        </div>
      )}

      {/* Step 1: Booster Pack Foil Tear ("Brewek") */}
      {stage === 'pack_tear' && (
        <BoosterPack
          count={results.length}
          highestRarityColor={highestRarityColor}
          onTear={() => setStage('card_peel')}
          onSkip={() => setStage('summary_grid')}
        />
      )}

      {/* Step 2: Card Stack Peeling / Trick Reveal */}
      {stage === 'card_peel' && (
        <CardStackPeel
          cards={results}
          newCardIds={newCardIds}
          onComplete={() => setStage('summary_grid')}
          onSkip={() => setStage('summary_grid')}
        />
      )}

      {/* Step 3: Summary Grid */}
      {stage === 'summary_grid' && (
        <div className="w-full max-w-6xl">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Summon Again
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setStage('card_peel')}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                <PackageOpen className="w-3.5 h-3.5" /> Replay Pack Reveal
              </button>
              {!revealAll && (
                <button
                  onClick={() => setRevealAll(true)}
                  className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> Reveal All Cards
                </button>
              )}
            </div>
          </div>

          {results.length === 1 ? (
            <div className="max-w-xs mx-auto py-8">
              <CardFlip
                card={results[0]}
                isNew={newCardIds.has(results[0].id)}
                revealed={revealAll}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
              {results.map((card, idx) => (
                <CardFlip
                  key={`${card.id}-${idx}`}
                  card={card}
                  isNew={newCardIds.has(card.id)}
                  revealed={revealAll}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
