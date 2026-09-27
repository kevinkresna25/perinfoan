import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, RotateCcw, Eye, PackageOpen, Scissors } from 'lucide-react';
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

      {/* Stage: Idle - Interactive Booster Pack Display on Pedestal */}
      {stage === 'idle' && (
        <div className="text-center max-w-lg w-full flex flex-col items-center">
          {/* 3D Booster Pack Preview */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/25 via-purple-500/25 to-indigo-500/25 rounded-3xl blur-2xl pointer-events-none" />
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              whileHover={{ scale: 1.03, rotate: 1 }}
              transition={{ duration: 0.4 }}
              className="relative w-56 sm:w-64 aspect-[1/1.55] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-indigo-400/40 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950"
            >
              {/* Foil Shimmer */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />

              {/* Top Crimped Foil Edge */}
              <div className="h-5 w-full bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400 border-b border-slate-500/50 flex items-center justify-around opacity-90 overflow-hidden">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="w-1 h-full bg-slate-500/30 skew-x-12" />
                ))}
              </div>

              {/* Pack Perforated Tear Strip Preview */}
              <div className="bg-gradient-to-r from-indigo-900 to-slate-900 px-3 py-2 border-b-2 border-dashed border-amber-400/80 flex items-center justify-between">
                <span className="text-[10px] font-black text-amber-300 tracking-wider flex items-center gap-1">
                  <Scissors className="w-3.5 h-3.5 text-amber-400" /> RIP TO BREWEK
                </span>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 shadow">
                  POKEMON STYLE
                </span>
              </div>

              {/* Center Pack Art */}
              <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30 mb-2">
                  <Sparkles className="w-8 h-8 text-white animate-bounce" />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-pink-300 to-purple-300 tracking-wider">
                  CELESTIAL BOOSTER
                </h3>
                <span className="text-[10px] font-extrabold tracking-widest text-indigo-300 uppercase mt-0.5">
                  BREWEK PACK
                </span>
                <div className="mt-3 px-3 py-0.5 rounded-full bg-slate-950/70 border border-indigo-400/30 text-[10px] font-bold text-slate-300">
                  READY TO TEAR
                </div>
              </div>

              {/* Bottom Crimped Edge */}
              <div className="h-5 w-full bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400 border-t border-slate-500/50 flex items-center justify-around opacity-90 overflow-hidden">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="w-1 h-full bg-slate-500/30 -skew-x-12" />
                ))}
              </div>
            </motion.div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 mb-2">
            Summon Celestial Cards
          </h2>
          <p className="text-slate-400 text-sm mb-6 max-w-md">
            Brewek Pokemon-Style Booster Pack! Rip the foil wrapper, peel through cards one-by-one with holographic edge peeks, and collect all rarities!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md">
            <button
              onClick={() => handlePull(1)}
              disabled={pulling}
              className="flex-1 py-3.5 px-5 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {pulling ? 'Summoning...' : 'Summon x1'}
            </button>
            <button
              onClick={() => handlePull(10)}
              disabled={pulling}
              className="flex-1 py-3.5 px-5 rounded-xl font-black bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white shadow-xl shadow-purple-900/40 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              {pulling ? 'Summoning...' : 'Summon x10'}
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
              <RotateCcw className="w-4 h-4" /> Brewek Another Pack (Summon Again)
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
