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
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 cursor-pointer min-w-0" onClick={() => setTab('summon')}>
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 shrink-0" />
            <span className="font-black text-sm sm:text-lg tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 whitespace-nowrap">
              CELESTIAL <span className="hidden xs:inline sm:inline">GACHA</span>
            </span>
          </div>

          <nav className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={() => setTab('summon')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1 sm:gap-1.5 transition-all ${
                tab === 'summon' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Summon
            </button>
            <button
              onClick={() => setTab('album')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1 sm:gap-1.5 transition-all ${
                tab === 'album' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Album
            </button>
            <button
              onClick={() => setTab('admin')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1 sm:gap-1.5 transition-all ${
                tab === 'admin' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Admin
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
