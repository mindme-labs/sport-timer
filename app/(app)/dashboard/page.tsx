import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveProgramByUserId } from "@/lib/db/programs";
import { getLogsByDateRange } from "@/lib/db/workoutLogs";
import {
  getCurrentCycleDay,
  getCurrentCycleStartDate,
} from "@/lib/utils/cycleDay";
import DashboardClient from "./DashboardClient";
import type { Routine, WorkoutLog } from "@/lib/types";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const program = await getActiveProgramByUserId(session.user.id);
  if (!program) redirect("/onboarding");

  const cycleDay = getCurrentCycleDay(
    program.startDate,
    program.cycleLengthDays,
    program.skipDayOffset
  );

  const cycleStartDate = getCurrentCycleStartDate(
    program.startDate,
    program.cycleLengthDays,
    program.skipDayOffset
  );

  const cycleEndDate = new Date(cycleStartDate);
  cycleEndDate.setDate(cycleEndDate.getDate() + program.cycleLengthDays - 1);

  const cycleLogs = await getLogsByDateRange(
    session.user.id,
    cycleStartDate,
    cycleEndDate
  );

  const serializableLogs = cycleLogs.map((l) => ({
    ...l,
    _id: l._id?.toString() ?? "",
    userId: l.userId.toString(),
    programId: l.programId.toString(),
    date: l.date.toISOString(),
  }));

  const serializableRoutines: Routine[] = program.routines.map((r) => ({
    ...r,
  }));

  return (
    <DashboardClient
      cycleDay={cycleDay}
      cycleLengthDays={program.cycleLengthDays}
      cycleStartDate={cycleStartDate.toISOString()}
      routines={serializableRoutines}
      cycleLogs={serializableLogs}
      programId={program._id!.toString()}
      userName={session.user.name ?? ""}
    />
  );
}
