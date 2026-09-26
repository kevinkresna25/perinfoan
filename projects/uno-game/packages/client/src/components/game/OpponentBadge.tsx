import React from 'react';
import { Player } from '@uno/shared';

interface OpponentBadgeProps {
  player: Player;
  isActiveTurn: boolean;
  onCatchUno?: () => void;
}

export const OpponentBadge: React.FC<OpponentBadgeProps> = ({
  player,
  isActiveTurn,
  onCatchUno,
}) => {
  const canCatch = player.cardsCount === 1 && !player.hasCalledUno;

  return (
    <div
      className={`
        flex flex-col items-center p-2.5 rounded-2xl bg-stone-800/90 border-2 transition-all
        ${isActiveTurn ? 'border-yellow-400 ring-2 ring-yellow-400/50 shadow-lg' : 'border-stone-700'}
        ${!player.isConnected ? 'opacity-50' : ''}
      `}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="font-semibold text-xs md:text-sm text-stone-200 truncate max-w-[100px]">
          {player.name}
        </span>
        {player.isHost && (
          <span className="px-1.5 py-0.2 rounded bg-yellow-500/20 text-yellow-400 text-[10px] font-bold">
            HOST
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Remaining cards badge */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-stone-900 border border-stone-700 text-xs font-bold text-yellow-400">
          <span>🎴</span>
          <span>{player.cardsCount}</span>
        </div>

        {/* UNO status or Catch Button */}
        {player.cardsCount === 1 && (
          <div>
            {!canCatch ? (
              <span className="px-2 py-0.5 rounded bg-red-600 text-white font-black text-[10px] tracking-wider animate-pulse">
                UNO!
              </span>
            ) : (
              <button
                type="button"
                onClick={onCatchUno}
                className="px-2 py-0.5 rounded bg-orange-500 hover:bg-orange-600 text-white font-black text-[10px] tracking-wider animate-bounce cursor-pointer shadow"
              >
                CATCH!
              </button>
            )}
          </div>
        )}
      </div>

      {!player.isConnected && (
        <span className="text-[10px] text-red-400 font-medium mt-1">Disconnected</span>
      )}
    </div>
  );
};
