import { useCallback, useState } from 'react';

export function useAudio() {
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem('uno_muted') === 'true';
  });

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      localStorage.setItem('uno_muted', String(next));
      return next;
    });
  }, []);

  const playTone = useCallback((freq: number, type: OscillatorType, duration: number) => {
    if (isMuted) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // AudioContext may be blocked before user interaction
    }
  }, [isMuted]);

  const playCardSound = useCallback(() => {
    playTone(440, 'triangle', 0.1);
  }, [playTone]);

  const playUnoAlert = useCallback(() => {
    playTone(880, 'sine', 0.3);
  }, [playTone]);

  const playWinSound = useCallback(() => {
    playTone(523.25, 'triangle', 0.15);
    setTimeout(() => playTone(659.25, 'triangle', 0.15), 150);
    setTimeout(() => playTone(783.99, 'triangle', 0.3), 300);
  }, [playTone]);

  return {
    isMuted,
    toggleMute,
    playCardSound,
    playUnoAlert,
    playWinSound,
  };
}
