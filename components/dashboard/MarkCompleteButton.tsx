"use client";

import { useState } from "react";
import { markCompleteAction } from "@/app/(app)/dashboard/actions";
import type { Workout } from "@/lib/types";

interface MarkCompleteButtonProps {
  programId: string;
  workout: Workout;
  cycleDay: number;
  onComplete: () => void;
}

export default function MarkCompleteButton({
  programId,
  workout,
  cycleDay,
  onComplete,
}: MarkCompleteButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleMark() {
    setLoading(true);
    try {
      await markCompleteAction(programId, workout, cycleDay);
      onComplete();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleMark}
      disabled={loading}
      className="flex items-center justify-center rounded-xl border border-border px-4 py-3.5 text-sm font-medium active:bg-muted disabled:opacity-50"
    >
      {loading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </button>
  );
}
