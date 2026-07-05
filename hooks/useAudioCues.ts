"use client";

import { useCallback } from "react";

// A single AudioContext shared across every useAudioCues() instance. The
// workout is started from one component (WorkoutRunner's "Start" button) but
// the countdown/switch beeps are played from another (TimerDisplay). If each
// instance had its own context, the one unlocked by the user's tap would not
// be the one that plays the beeps — so on iOS the playing context would stay
// suspended and produce no sound. Sharing one context fixes that.
let sharedCtx: AudioContext | null = null;

function getSharedContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedCtx) {
    sharedCtx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
  }
  return sharedCtx;
}

export function useAudioCues() {
  const playBeep = useCallback((frequency: number, duration: number) => {
    const ctx = getSharedContext();
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
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }, []);

  const playCountdownBeep = useCallback(() => {
    playBeep(880, 0.15);
  }, [playBeep]);

  const playExerciseSwitchBeep = useCallback(() => {
    playBeep(1200, 0.4);
  }, [playBeep]);

  // Called from a user gesture (the "Start Workout" tap) to unlock the shared
  // AudioContext so later beeps are audible on mobile.
  const initAudio = useCallback(() => {
    const ctx = getSharedContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume();
    }
  }, []);

  return { playCountdownBeep, playExerciseSwitchBeep, initAudio };
}
