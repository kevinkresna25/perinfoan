import React, { useState } from 'react';
import { Player } from '@uno/shared';
import { CustomImageUploader } from './CustomImageUploader';
import { motion } from 'framer-motion';

interface LobbyViewProps {
  roomId: string | null;
  players: Player[];
  isHost: boolean;
  onCreateRoom: (hostName: string) => void;
  onJoinRoom: (roomId: string, playerName: string) => void;
  onStartGame: () => void;
  onCustomImageUploaded: (slot: string, url: string) => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  roomId,
  players,
  isHost,
  onCreateRoom,
  onJoinRoom,
  onStartGame,
  onCustomImageUploaded,
}) => {
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyLink = () => {
    if (!roomId) return;
    const url = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // If not yet in a room:
  if (!roomId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-6 md:p-8 shadow-2xl text-center"
        >
          {/* Logo Badge */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg border-2 border-yellow-400 transform -rotate-6">
            <span className="font-black text-2xl text-yellow-300 italic">UNO</span>
          </div>

          <h2 className="text-2xl font-black text-stone-100">Perinfoan UNO</h2>
          <p className="text-xs text-stone-400 mt-1 mb-6">
            Multiplayer card game for circle members &amp; friends
          </p>

          <div className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                Your Nickname
              </label>
              <input
                type="text"
                placeholder="e.g. Christopher"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-stone-100 focus:outline-hidden focus:border-yellow-400"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => onCreateRoom(name || 'Player')}
                className="w-full py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-stone-950 font-black text-sm uppercase tracking-wider shadow-lg transition-all cursor-pointer"
              >
                Create Private Room
              </button>
            </div>

            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-stone-800" />
              <span className="px-3 text-xs text-stone-500 font-semibold uppercase">Or Join Existing</span>
              <div className="flex-1 border-t border-stone-800" />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="6-LETTER CODE"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="flex-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-2 text-sm font-mono tracking-widest text-center uppercase text-stone-100 focus:outline-hidden focus:border-yellow-400"
              />
              <button
                type="button"
                disabled={joinCode.length !== 6}
                onClick={() => onJoinRoom(joinCode, name || 'Player')}
                className="px-6 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-stone-800 disabled:text-stone-600 text-white font-bold text-sm tracking-wide transition-all cursor-pointer"
              >
                Join
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Inside Room Lobby waiting for players:
  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] px-4 py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-3xl p-6 md:p-8 shadow-2xl text-center space-y-6"
      >
        {/* Room Header & Share Code */}
        <div>
          <span className="text-xs uppercase tracking-widest text-stone-500 font-semibold">Game Room Code</span>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
            <span className="text-4xl font-black font-mono tracking-widest text-yellow-400 mr-1">{roomId}</span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-300 border border-stone-700 transition-colors cursor-pointer"
            >
              {copiedCode ? 'Copied! ✓' : 'Copy Code'}
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-300 border border-stone-700 transition-colors cursor-pointer"
            >
              {copiedLink ? 'Copied! ✓' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* Players Waiting List */}
        <div className="bg-stone-950/60 rounded-2xl p-4 border border-stone-800 text-left">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Players In Room ({players.length}/8)
            </span>
            {players.length < 2 && (
              <span className="text-xs text-yellow-500 font-medium">Need min. 2 players</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {players.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 p-2 rounded-xl bg-stone-800 border border-stone-700"
              >
                <div className="w-7 h-7 rounded-lg bg-stone-700 flex items-center justify-center text-xs font-bold text-yellow-400">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="truncate flex-1">
                  <p className="text-xs font-bold text-stone-200 truncate">{p.name}</p>
                  {p.isHost && <span className="text-[10px] text-yellow-400 font-semibold">Room Host</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Card Art Uploader (Host Only) */}
        {isHost && (
          <CustomImageUploader roomId={roomId} onUploaded={onCustomImageUploaded} />
        )}

        {/* Start Game Action */}
        <div>
          {isHost ? (
            <button
              type="button"
              disabled={players.length < 2}
              onClick={onStartGame}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-stone-800 disabled:text-stone-600 text-stone-950 font-black text-base uppercase tracking-wider shadow-xl transition-all cursor-pointer"
            >
              {players.length < 2 ? 'Waiting for Friends to Join...' : 'Start Game!'}
            </button>
          ) : (
            <div className="p-3 rounded-xl bg-stone-800 text-stone-400 text-xs font-medium animate-pulse">
              Waiting for the host to start the game...
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
