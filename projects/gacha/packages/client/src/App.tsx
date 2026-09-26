import React, { useState } from 'react';
import { Sparkles, BookOpen, Shield } from 'lucide-react';
import { SummonStage } from './components/SummonStage';
import { AlbumView } from './components/AlbumView';
import { AdminPanel } from './components/AdminPanel';
import { RatesModal } from './components/RatesModal';
import type { ViewTab } from './types';

export const App: React.FC = () => {
  const [tab, setTab] = useState<ViewTab>('summon');
  const [ratesModalOpen, setRatesModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setTab('summon')}>
            <Sparkles className="w-6 h-6 text-purple-400" />
            <span className="font-black text-lg tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
              CELESTIAL GACHA
            </span>
          </div>

          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setTab('summon')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all ${
                tab === 'summon' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" /> Summon
            </button>
            <button
              onClick={() => setTab('album')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all ${
                tab === 'album' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" /> Album
            </button>
            <button
              onClick={() => setTab('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all ${
                tab === 'admin' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-4 h-4" /> Admin
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {tab === 'summon' && <SummonStage onOpenRates={() => setRatesModalOpen(true)} />}
        {tab === 'album' && <AlbumView />}
        {tab === 'admin' && <AdminPanel />}
      </main>

      {ratesModalOpen && <RatesModal onClose={() => setRatesModalOpen(false)} />}
    </div>
  );
};
