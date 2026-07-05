"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export function useWakeLock() {
  const [isSupported, setIsSupported] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  // Whether the lock *should* be held. The OS releases the sentinel when the
  // app is backgrounded (which flips isActive to false), so we can't rely on
  // isActive to decide whether to re-acquire on return — we track intent here.
  const shouldHoldRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !("wakeLock" in navigator)) {
      setIsSupported(false);
    }
  }, []);

  const acquire = useCallback(async () => {
    if (typeof window === "undefined" || !("wakeLock" in navigator)) return;
    shouldHoldRef.current = true;
    // Avoid stacking multiple sentinels if acquire() is called repeatedly.
    if (wakeLockRef.current) return;
    try {
      const sentinel = await navigator.wakeLock.request("screen");
      wakeLockRef.current = sentinel;
      setIsActive(true);
      sentinel.addEventListener("release", () => {
        // Fired both on manual release and when the OS drops the lock on
        // backgrounding. Clear the ref so a later re-acquire can request a
        // fresh sentinel.
        if (wakeLockRef.current === sentinel) {
          wakeLockRef.current = null;
        }
        setIsActive(false);
      });
    } catch {
      setIsActive(false);
    }
  }, []);

  const release = useCallback(async () => {
    shouldHoldRef.current = false;
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {}
      wakeLockRef.current = null;
      setIsActive(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibilityChange = () => {
      // Re-acquire when returning to the app if the lock is still wanted, even
      // though isActive is false after the OS released it while backgrounded.
      if (document.visibilityState === "visible" && shouldHoldRef.current) {
        acquire();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [acquire]);

  useEffect(() => {
    return () => {
      release();
    };
  }, [release]);

  return { isSupported, isActive, acquire, release };
}
