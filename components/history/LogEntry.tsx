import StatusBadge from "./StatusBadge";
import type { WorkoutLog } from "@/lib/types";

interface LogEntryProps {
  log: WorkoutLog;
}

export default function LogEntry({ log }: LogEntryProps) {
  const time = new Date(log.date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const skippedWithProgress = log.skippedExercises?.filter(
    (s) => s.timeSpentSec && s.timeSpentSec >= 5
  );

  return (
    <div className="rounded-xl border border-border bg-muted/50 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{log.workoutName}</span>
            <StatusBadge status={log.status} />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {time} · Day {log.cycleDayNumber}
          </p>
        </div>
        {log.status !== "skipped" && log.status !== "discarded" && (
          <div className="text-right">
            <span className="text-lg font-bold">
              {Math.round(log.completionPercentage)}%
            </span>
          </div>
        )}
      </div>
      {skippedWithProgress && skippedWithProgress.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {skippedWithProgress.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-md bg-amber-100/50 px-2.5 py-1 text-[11px] dark:bg-amber-900/20"
            >
              <span className="text-amber-800 dark:text-amber-400">
                {s.exerciseName} (R{s.round}) — skipped
              </span>
              <span className="font-medium text-amber-700 dark:text-amber-300">
                {s.timeSpentSec}s / {s.durationSec}s
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
