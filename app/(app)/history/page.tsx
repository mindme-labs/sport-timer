import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getLogsByUserId } from "@/lib/db/workoutLogs";
import LogEntry from "@/components/history/LogEntry";
import type { WorkoutLog } from "@/lib/types";

function groupByDate(logs: WorkoutLog[]): Record<string, WorkoutLog[]> {
  const groups: Record<string, WorkoutLog[]> = {};
  for (const log of logs) {
    const date = new Date(log.date);
    const key = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    if (!groups[key]) groups[key] = [];
    groups[key].push(log);
  }
  return groups;
}

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const logs = await getLogsByUserId(session.user.id);
  const grouped = groupByDate(logs);
  const dateKeys = Object.keys(grouped);

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Workout History</h1>

      {dateKeys.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-muted p-8 text-center">
          <span className="text-5xl">💪</span>
          <div>
            <h2 className="text-lg font-semibold">No workouts yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Start your first session!
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {dateKeys.map((dateKey) => (
            <div key={dateKey}>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
                {dateKey}
              </h2>
              <div className="flex flex-col gap-2">
                {grouped[dateKey].map((log) => (
                  <LogEntry key={log._id?.toString()} log={log} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
