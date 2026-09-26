import React from 'react';

interface TurnTimerProps {
  remainingSeconds: number;
  totalSeconds: number;
}

export const TurnTimer: React.FC<TurnTimerProps> = ({ remainingSeconds, totalSeconds }) => {
  const percentage = Math.max(0, Math.min(100, (remainingSeconds / totalSeconds) * 100));
  const isUrgent = remainingSeconds <= 5;

  return (
    <div className="flex flex-col items-center">
      <div className="w-32 bg-stone-800 rounded-full h-2.5 overflow-hidden border border-stone-700">
        <div
          className={`h-full transition-all duration-1000 ${
            isUrgent ? 'bg-red-500 animate-pulse' : 'bg-yellow-400'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`text-[11px] font-bold mt-1 ${isUrgent ? 'text-red-400' : 'text-stone-400'}`}>
        {remainingSeconds}s remaining
      </span>
    </div>
  );
};
