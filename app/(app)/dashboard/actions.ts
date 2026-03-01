"use server";

import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth";
import {
  incrementSkipDayOffset,
  getActiveProgramByUserId,
  completeCycle,
} from "@/lib/db/programs";
import { createWorkoutLog } from "@/lib/db/workoutLogs";
import { getCurrentCycleDay } from "@/lib/utils/cycleDay";
import type { Workout, WorkoutLog } from "@/lib/types";

export async function skipDayAction(
  programId: string,
  cycleDay: number
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  await incrementSkipDayOffset(programId);

  await createWorkoutLog({
    userId: new ObjectId(session.user.id),
    programId: new ObjectId(programId),
    workoutId: `skip-day-${cycleDay}`,
    workoutName: `Day ${cycleDay} (Skipped)`,
    cycleDayNumber: cycleDay,
    date: new Date(),
    status: "skipped",
    totalPlannedSec: 0,
    totalCompletedSec: 0,
    completionPercentage: 0,
    skippedExercises: [],
    actionLogs: [
      { timestamp: new Date().toISOString(), action: "skipped_day" },
    ],
  });
}

export async function markCompleteAction(
  programId: string,
  workout: Workout,
  cycleDay: number
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const totalPlannedSec =
    workout.exercises.reduce((sum, e) => sum + e.durationSec, 0) *
    workout.rounds;

  await createWorkoutLog({
    userId: new ObjectId(session.user.id),
    programId: new ObjectId(programId),
    workoutId: workout.workoutId,
    workoutName: workout.name,
    cycleDayNumber: cycleDay,
    date: new Date(),
    status: "manually_marked",
    totalPlannedSec,
    totalCompletedSec: totalPlannedSec,
    completionPercentage: 100,
    skippedExercises: [],
    actionLogs: [
      { timestamp: new Date().toISOString(), action: "manually_marked" },
    ],
  });
}

export async function completeCycleAction(programId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const program = await getActiveProgramByUserId(session.user.id);
  if (!program) throw new Error("No active program");

  const currentDay = getCurrentCycleDay(
    program.startDate,
    program.cycleLengthDays,
    program.skipDayOffset
  );

  await completeCycle(programId, currentDay, program.cycleLengthDays);
}
