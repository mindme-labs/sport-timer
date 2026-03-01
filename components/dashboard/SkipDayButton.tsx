"use client";

import { useState } from "react";
import { skipDayAction } from "@/app/(app)/dashboard/actions";

interface SkipDayButtonProps {
  programId: string;
  cycleDay: number;
  onSkipped: () => void;
}

export default function SkipDayButton({
  programId,
  cycleDay,
  onSkipped,
}: SkipDayButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSkip() {
    setLoading(true);
    try {
      await skipDayAction(programId, cycleDay);
      onSkipped();
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="rounded-xl border border-warning/50 bg-warning/10 p-4">
        <p className="mb-3 text-sm font-medium">
          Skip today&apos;s training? The cycle will advance to the next day.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleSkip}
            disabled={loading}
            className="flex-1 rounded-lg bg-warning py-2.5 text-sm font-semibold text-black active:opacity-80 disabled:opacity-50"
          >
            {loading ? "Skipping..." : "Yes, Skip"}
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
      Skip Training Day
    </button>
  );
}
