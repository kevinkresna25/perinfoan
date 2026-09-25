import React from 'react';
import { Card } from '@uno/shared';
import { motion } from 'framer-motion';

interface UnoCardProps {
  card: Card;
  isPlayable?: boolean;
  customImage?: string;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  isBack?: boolean;
}

export const UnoCard: React.FC<UnoCardProps> = ({
  card,
  isPlayable = false,
  customImage,
  onClick,
  size = 'md',
  isBack = false,
}) => {
  const sizeClasses = {
    sm: 'w-12 h-18 text-xs',
    md: 'w-20 h-28 text-sm md:w-24 md:h-36 md:text-base',
    lg: 'w-28 h-40 text-base md:w-32 md:h-48 md:text-lg',
  }[size];

  const colorBg = {
    red: 'bg-red-600',
    blue: 'bg-blue-600',
    green: 'bg-emerald-600',
    yellow: 'bg-yellow-400 text-stone-900',
    wild: 'bg-stone-900',
  }[card.color];

  const renderContent = () => {
    if (customImage) {
      return (
        <img
          src={customImage}
          alt="Custom Card"
          className="w-full h-full object-cover rounded-md"
        />
      );
    }

    if (card.type === 'number') {
      return <span className="font-black text-3xl md:text-4xl italic drop-shadow-md">{card.value}</span>;
    }

    if (card.type === 'skip') {
      return <span className="font-black text-xl md:text-2xl uppercase tracking-tighter">⊘</span>;
    }

    if (card.type === 'reverse') {
      return <span className="font-black text-xl md:text-2xl uppercase tracking-tighter">⇄</span>;
    }

    if (card.type === 'draw2') {
      return <span className="font-black text-xl md:text-2xl italic">+2</span>;
    }

    if (card.type === 'wild') {
      return (
        <div className="grid grid-cols-2 w-8 h-8 rounded-full overflow-hidden border border-white/50 shadow-inner">
          <div className="bg-red-600" />
          <div className="bg-blue-600" />
          <div className="bg-yellow-400" />
          <div className="bg-emerald-600" />
        </div>
      );
    }

    if (card.type === 'wild_draw4') {
      return (
        <div className="flex flex-col items-center">
          <span className="font-black text-xl md:text-2xl text-yellow-300 italic">+4</span>
          <div className="grid grid-cols-2 w-6 h-6 rounded-full overflow-hidden border border-white/50">
            <div className="bg-red-600" />
            <div className="bg-blue-600" />
            <div className="bg-yellow-400" />
            <div className="bg-emerald-600" />
          </div>
        </div>
      );
    }

    return null;
  };

  if (isBack) {
    return (
      <div
        className={`${sizeClasses} rounded-xl bg-stone-900 border-2 border-white/80 shadow-lg flex items-center justify-center relative overflow-hidden`}
      >
        {customImage ? (
          <img src={customImage} alt="Card Back" className="w-full h-full object-cover" />
        ) : (
          <div className="w-4/5 h-4/5 rounded-full bg-red-600 flex items-center justify-center transform -rotate-12 border border-yellow-400">
            <span className="font-black text-yellow-400 italic text-xl tracking-tight">UNO</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.button
      type="button"
      whileHover={isPlayable ? { y: -16, scale: 1.05 } : {}}
      whileTap={isPlayable ? { scale: 0.95 } : {}}
      onClick={isPlayable ? onClick : undefined}
      disabled={!isPlayable}
      className={`
        ${sizeClasses}
        ${colorBg}
        relative rounded-xl p-1.5 border-2 border-white/90 shadow-xl
        flex flex-col justify-between items-center transition-opacity
        ${isPlayable ? 'cursor-pointer hover:shadow-2xl ring-2 ring-yellow-300 ring-offset-2 ring-offset-stone-900' : 'opacity-85 cursor-not-allowed'}
      `}
    >
      {/* Top Left Corner Index */}
      <div className="self-start text-xs font-black leading-none drop-shadow">
        {card.type === 'number'
          ? card.value
          : card.type === 'skip'
          ? '⊘'
          : card.type === 'reverse'
          ? '⇄'
          : card.type === 'draw2'
          ? '+2'
          : card.type === 'wild'
          ? 'W'
          : '+4'}
      </div>

      {/* Center Ellipse Area */}
      <div className="w-full h-3/5 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center overflow-hidden transform -rotate-12 border border-white/40">
        {renderContent()}
      </div>

      {/* Bottom Right Corner Index */}
      <div className="self-end text-xs font-black leading-none transform rotate-180 drop-shadow">
        {card.type === 'number'
          ? card.value
          : card.type === 'skip'
          ? '⊘'
          : card.type === 'reverse'
          ? '⇄'
          : card.type === 'draw2'
          ? '+2'
          : card.type === 'wild'
          ? 'W'
          : '+4'}
      </div>
    </motion.button>
  );
};
