"use client";

import { useState } from "react";
import { completeCycleAction } from "@/app/(app)/dashboard/actions";

interface CompleteCycleButtonProps {
  programId: string;
  onCompleted: () => void;
}

export default function CompleteCycleButton({
  programId,
  onCompleted,
}: CompleteCycleButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleComplete() {
    setLoading(true);
    try {
      await completeCycleAction(programId);
      onCompleted();
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
        <p className="mb-3 text-sm font-medium">
          Reset the cycle to Day 1? Your history is preserved.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleComplete}
            disabled={loading}
            className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground active:opacity-80 disabled:opacity-50"
          >
            {loading ? "Resetting..." : "Yes, Start Fresh"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="flex-1 rounded-lg bg-muted py-2.5 text-sm font-medium active:bg-border"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="w-full rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground active:bg-muted"
    >
      Complete Cycle & Start Fresh
    </button>
  );
}
