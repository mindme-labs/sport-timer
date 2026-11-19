"use client";

import { useCallback } from "react";

// A single AudioContext shared across every useAudioCues() instance. The
// workout is started from one component (WorkoutRunner's "Start" button) but
// the countdown/switch beeps are played from another (TimerDisplay). If each
// instance had its own context, the one unlocked by the user's tap would not
// be the one that plays the beeps — so on iOS the playing context would stay
// suspended and produce no sound. Sharing one context fixes that.
let sharedCtx: AudioContext | null = null;
let gestureListenersAdded = false;

// On iOS, WebAudio uses the "ambient" audio session by default, which is muted
// by the Ring/Silent switch — so with the phone on silent the beeps never play.
// The Audio Session API (Safari 17+) lets us switch to "playback", which plays
// through the silent switch. Trade-off (chosen on purpose): playback pauses
// music from other apps for the duration of the workout.
function enablePlaybackAudioSession() {
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  if (nav.audioSession && nav.audioSession.type !== "playback") {
    try {
      nav.audioSession.type = "playback";
    } catch {
      // older Safari / unsupported value — fall back to the default session
    }
  }
}

// Safari can leave the context "suspended" (autoplay policy, backgrounding) or
// "interrupted" (phone call, Siri, screen lock, another app took audio). Both
// mean silence, and resume() only reliably works inside a user gesture.
function wakeContext(ctx: AudioContext) {
  if (ctx.state !== "running") {
    ctx.resume().catch(() => {});
  }
}

function getSharedContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedCtx || sharedCtx.state === "closed") {
    enablePlaybackAudioSession();
    sharedCtx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
  }
  if (!gestureListenersAdded) {
    gestureListenersAdded = true;
    // Any tap during the workout (pause, skip, help) re-unlocks the context if
    // iOS suspended or interrupted it, e.g. after the app returned from the
    // background — beeps fired from timers alone can't resume it.
    const unlock = () => {
      if (sharedCtx) wakeContext(sharedCtx);
    };
    document.addEventListener("touchend", unlock, { passive: true });
    document.addEventListener("pointerdown", unlock, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") unlock();
    });
  }
  return sharedCtx;
}

export function useAudioCues() {
  const playBeep = useCallback((frequency: number, duration: number) => {
    const ctx = getSharedContext();
    if (!ctx) return;

    wakeContext(ctx);

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
  // AudioContext so later beeps are audible on mobile. resume() alone is not
  // enough on iOS: WebAudio stays silent until an oscillator has actually run
  // inside the gesture. So we also play a 0-gain (silent) tone to prime it.
  const initAudio = useCallback(() => {
    if (typeof window === "undefined") return;
    enablePlaybackAudioSession();
    const ctx = getSharedContext();
    if (!ctx) return;
    wakeContext(ctx);
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.03);
    } catch {
      // best-effort priming; ignore if the context rejects it
    }
  }, []);

  return { playCountdownBeep, playExerciseSwitchBeep, initAudio };
}
