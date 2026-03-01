"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem("pwa-install-dismissed");
    if (stored) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", "1");
  }

  return (
    <div className="mx-4 mb-4 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
      <div className="flex-1">
        <p className="text-sm font-medium">Install Sport Timer</p>
        <p className="text-xs text-muted-foreground">
          Add to your home screen for the best experience
        </p>
      </div>
      <button
        onClick={handleInstall}
        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground active:opacity-80"
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        className="text-muted-foreground active:text-foreground"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
