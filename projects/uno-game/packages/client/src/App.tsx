import { useState, useEffect } from 'react';
import { Card, CardColor } from '@uno/shared';
import { useSocket } from './hooks/useSocket';
import { useAudio } from './hooks/useAudio';
import { LobbyView } from './components/lobby/LobbyView';
import { Table } from './components/game/Table';
import { Hand } from './components/game/Hand';
import { OpponentBadge } from './components/game/OpponentBadge';
import { ColorPicker } from './components/game/ColorPicker';
import { UnoButton } from './components/game/UnoButton';
import { TurnTimer } from './components/game/TurnTimer';

export function App() {
  const {
    isConnected,
    gameState,
    playerId,
    actionLog,
    errorMessage,
    createRoom,
    joinRoom,
    startGame,
    playCard,
    drawCard,
    callUno,
    catchUno,
  } = useSocket();

  const { isMuted, toggleMute, playCardSound, playUnoAlert, playWinSound } = useAudio();

  const [pendingWildCard, setPendingWildCard] = useState<Card | null>(null);

  // Auto-join from URL parameter ?room=XXXXXX
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && !gameState) {
      const storedName = localStorage.getItem('uno_player_name') || 'Guest';
      joinRoom(roomParam.toUpperCase(), storedName);
    }
  }, [joinRoom, gameState]);

  // Audio triggers on actionLog events
  useEffect(() => {
    if (!actionLog) return;
    if (actionLog.type === 'win') {
      playWinSound();
    } else if (actionLog.type === 'alert') {
      playUnoAlert();
    } else {
      playCardSound();
    }
  }, [actionLog, playCardSound, playUnoAlert, playWinSound]);

  const handleCardClick = (card: Card) => {
    if (card.color === 'wild') {
      setPendingWildCard(card);
    } else {
      playCard(card.id);
    }
  };

  const handleSelectWildColor = (color: CardColor) => {
    if (pendingWildCard) {
      playCard(pendingWildCard.id, color);
      setPendingWildCard(null);
    }
  };

  const handleCustomImageUploaded = (slot: string, url: string) => {
    if (gameState) {
      gameState.customImages[slot] = url;
    }
  };

  // 1. Lobby Phase
  if (!gameState || gameState.status === 'lobby') {
    const currentPlayer = gameState?.players.find((p) => p.id === playerId);
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col justify-between">
        <header className="p-4 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-2">
            <span className="font-black text-xl italic text-red-500">UNO</span>
            <span className="text-xs font-bold text-stone-400">by Perinfoan</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleMute}
              className="text-xs font-semibold px-3 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 cursor-pointer"
            >
              {isMuted ? '🔇 Muted' : '🔊 Sound On'}
            </button>
            <div className="flex items-center gap-1.5 text-xs text-stone-400">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span>{isConnected ? 'Online' : 'Connecting...'}</span>
            </div>
          </div>
        </header>

        <LobbyView
          roomId={gameState ? gameState.roomId : null}
          players={gameState ? gameState.players : []}
          isHost={currentPlayer?.isHost || false}
          onCreateRoom={(hostName) => {
            localStorage.setItem('uno_player_name', hostName);
            createRoom(hostName);
          }}
          onJoinRoom={(roomId, playerName) => {
            localStorage.setItem('uno_player_name', playerName);
            joinRoom(roomId, playerName);
          }}
          onStartGame={startGame}
          onCustomImageUploaded={handleCustomImageUploaded}
        />

        <footer className="p-4 text-center text-xs text-stone-600 border-t border-stone-900">
          Perinfoan Decoupled Architecture · Docker + Cloudflare Tunnel
        </footer>
      </div>
    );
  }

  // 2. In-Game Phase
  const myPlayer = gameState.players.find((p) => p.id === playerId);
  const myHand = myPlayer?.hand || [];
  const activePlayer = gameState.players[gameState.activePlayerIndex];
  const isMyTurn = activePlayer?.id === playerId;
  const opponents = gameState.players.filter((p) => p.id !== playerId);
  const winner = gameState.players.find((p) => p.id === gameState.winnerId);

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col justify-between overflow-hidden relative">
      {/* Top Header & Opponents Bar */}
      <header className="px-4 py-2 border-b border-stone-800/80 bg-stone-900/60 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <span className="font-black text-lg italic text-red-500">UNO</span>
          <span className="text-xs font-mono font-bold text-yellow-400">#{gameState.roomId}</span>
        </div>

        <div className="flex items-center gap-3">
          <TurnTimer
            remainingSeconds={gameState.turnRemainingSeconds}
            totalSeconds={gameState.turnTimeLimit}
          />
          <button
            type="button"
            onClick={toggleMute}
            className="text-xs px-2.5 py-1 rounded-lg bg-stone-800 text-stone-300 border border-stone-700 cursor-pointer"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>
      </header>

      {/* Opponents Badges Carousel */}
      <div className="flex items-center justify-center gap-3 p-3 overflow-x-auto z-10">
        {opponents.map((opponent) => (
          <OpponentBadge
            key={opponent.id}
            player={opponent}
            isActiveTurn={activePlayer?.id === opponent.id}
            onCatchUno={() => catchUno(opponent.id)}
          />
        ))}
      </div>

      {/* Center Felt Game Table */}
      <main className="flex-1 flex items-center justify-center px-4 relative z-0">
        <Table
          topCard={gameState.topCard}
          activeColor={gameState.activeColor}
          direction={gameState.direction}
          drawPileCount={gameState.drawPileCount}
          customImages={gameState.customImages}
          isMyTurn={isMyTurn}
          onDrawCard={drawCard}
          actionLog={actionLog}
        />
      </main>

      {/* Bottom Area: Controls & Player Hand */}
      <footer className="flex flex-col items-center justify-end z-10 pb-4">
        {/* Turn Status Alert & UNO Button */}
        <div className="flex items-center gap-4 mb-2">
          <div className="px-4 py-1.5 rounded-full bg-stone-900/90 border border-stone-700 text-xs font-bold shadow">
            {isMyTurn ? (
              <span className="text-yellow-400 animate-pulse">👉 IT&apos;S YOUR TURN!</span>
            ) : (
              <span className="text-stone-400">Waiting for {activePlayer?.name}...</span>
            )}
          </div>

          <UnoButton
            canCall={myHand.length === 1 || (myHand.length === 2 && isMyTurn)}
            hasCalled={myPlayer?.hasCalledUno || false}
            onCallUno={callUno}
          />
        </div>

        {/* Player's Cards Hand */}
        <Hand
          cards={myHand}
          topCard={gameState.topCard}
          activeColor={gameState.activeColor}
          isMyTurn={isMyTurn}
          customImages={gameState.customImages}
          onPlayCard={handleCardClick}
        />
      </footer>

      {/* Wild Color Picker Modal */}
      <ColorPicker
        isOpen={Boolean(pendingWildCard)}
        onSelectColor={handleSelectWildColor}
      />

      {/* Error Toast */}
      {errorMessage && (
        <div className="fixed bottom-24 bg-red-600/95 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-2xl z-50 animate-bounce">
          {errorMessage}
        </div>
      )}

      {/* Winner Celebration Modal */}
      {gameState.status === 'ended' && winner && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border-2 border-yellow-400 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-3">🏆</div>
            <h2 className="text-2xl font-black text-stone-100">MATCH OVER!</h2>
            <p className="text-yellow-400 font-bold text-lg mt-1 mb-6">
              {winner.name} won the game!
            </p>
            {myPlayer?.isHost ? (
              <button
                type="button"
                onClick={startGame}
                className="w-full py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-stone-950 font-black text-sm uppercase tracking-wider shadow-lg cursor-pointer"
              >
                Play Another Round
              </button>
            ) : (
              <p className="text-xs text-stone-400">Waiting for host to restart...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
