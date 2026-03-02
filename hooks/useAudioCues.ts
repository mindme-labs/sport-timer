"use client";

import { useRef, useCallback, useEffect } from "react";

export function useAudioCues() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const playBeep = useCallback(
    (frequency: number, duration: number) => {
      const ctx = getContext();
      if (!ctx) return;

      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      gainNode.gain.value = 0.3;

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        ctx.currentTime + duration
      );

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    },
    [getContext]
  );

  const playCountdownBeep = useCallback(() => {
    playBeep(880, 0.15);
  }, [playBeep]);

  const playExerciseSwitchBeep = useCallback(() => {
    playBeep(1200, 0.4);
  }, [playBeep]);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, []);

  const initAudio = useCallback(() => {
    const ctx = getContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume();
    }
  }, [getContext]);

  return { playCountdownBeep, playExerciseSwitchBeep, initAudio };
}
