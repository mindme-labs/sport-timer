"use server";

import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth";
import { upsertWorkoutLog } from "@/lib/db/workoutLogs";
import type { WorkoutLogStatus, SkippedExercise, ActionLog } from "@/lib/types";

export async function saveWorkoutLogAction(data: {
  programId: string;
  workoutId: string;
  workoutName: string;
  cycleDayNumber: number;
  status: WorkoutLogStatus;
  totalPlannedSec: number;
  totalCompletedSec: number;
  completionPercentage: number;
  skippedExercises: SkippedExercise[];
  actionLogs: ActionLog[];
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  await upsertWorkoutLog({
    userId: new ObjectId(session.user.id),
    programId: new ObjectId(data.programId),
    workoutId: data.workoutId,
    workoutName: data.workoutName,
    cycleDayNumber: data.cycleDayNumber,
    date: new Date(),
    status: data.status,
    totalPlannedSec: data.totalPlannedSec,
    totalCompletedSec: data.totalCompletedSec,
    completionPercentage: data.completionPercentage,
    skippedExercises: data.skippedExercises,
    actionLogs: data.actionLogs,
  });
}
