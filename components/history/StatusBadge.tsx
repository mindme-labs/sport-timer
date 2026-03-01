import type { WorkoutLogStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: WorkoutLogStatus;
}

const statusConfig: Record<
  WorkoutLogStatus,
  { label: string; className: string }
> = {
  completed: {
    label: "Completed",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  manually_marked: {
    label: "Marked",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  partially_completed: {
    label: "Partial",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  finished_early: {
    label: "Early",
    className: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  },
  skipped: {
    label: "Skipped",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
  discarded: {
    label: "Discarded",
    className: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}
