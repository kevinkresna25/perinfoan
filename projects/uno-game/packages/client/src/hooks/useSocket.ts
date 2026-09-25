import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ClientGameState, CardColor } from '@uno/shared';

function getSessionPlayerId(): string {
  let id = sessionStorage.getItem('uno_player_id');
  if (!id) {
    id = `p_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    sessionStorage.setItem('uno_player_id', id);
  }
  return id;
}

export function useSocket() {
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [actionLog, setActionLog] = useState<{ text: string; type: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const playerId = getSessionPlayerId();

  useEffect(() => {
    const socket = io({
      query: { playerId },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('game:sync', (state: ClientGameState) => {
      setGameState(state);
    });

    socket.on('game:action_feed', (log: { text: string; type: string }) => {
      setActionLog(log);
      setTimeout(() => setActionLog(null), 3500);
    });

    socket.on('game:error', (err: { message: string }) => {
      setErrorMessage(err.message);
      setTimeout(() => setErrorMessage(null), 4000);
    });

    return () => {
      socket.disconnect();
    };
  }, [playerId]);

  const createRoom = useCallback((hostName: string, turnTimeLimit: number = 30) => {
    socketRef.current?.emit('room:create', { hostName, turnTimeLimit });
  }, []);

  const joinRoom = useCallback((roomId: string, playerName: string) => {
    socketRef.current?.emit('room:join', { roomId, playerName, playerId });
  }, [playerId]);

  const startGame = useCallback(() => {
    socketRef.current?.emit('game:start');
  }, []);

  const playCard = useCallback((cardId: string, chosenColor?: CardColor) => {
    socketRef.current?.emit('game:play_card', { cardId, chosenColor });
  }, []);

  const drawCard = useCallback(() => {
    socketRef.current?.emit('game:draw_card');
  }, []);

  const callUno = useCallback(() => {
    socketRef.current?.emit('game:call_uno');
  }, []);

  const catchUno = useCallback((targetPlayerId: string) => {
    socketRef.current?.emit('game:catch_uno', { targetPlayerId });
  }, []);

  return {
    socket: socketRef.current,
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
  };
}
