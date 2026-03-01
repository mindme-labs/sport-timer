"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export function useWakeLock() {
  const [isSupported, setIsSupported] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !("wakeLock" in navigator)) {
      setIsSupported(false);
    }
  }, []);

  const acquire = useCallback(async () => {
    if (typeof window === "undefined" || !("wakeLock" in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
      setIsActive(true);
      wakeLockRef.current.addEventListener("release", () => {
        setIsActive(false);
      });
    } catch {
      setIsActive(false);
    }
  }, []);

  const release = useCallback(async () => {
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

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && isActive) {
        await acquire();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isActive, acquire]);

  useEffect(() => {
    return () => {
      release();
    };
  }, [release]);

  return { isSupported, isActive, acquire, release };
}
