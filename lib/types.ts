import { ObjectId } from "mongodb";

export interface Exercise {
  name: string;
  description?: string;
  durationSec: number;
  restAfterSec: number;
}

export interface Workout {
  workoutId: string;
  name: string;
  description?: string;
  rounds: number;
  restAfterRoundSec: number;
  preparation?: Exercise[];
  exercises: Exercise[];
  coolDown?: Exercise[];
}

export interface Routine {
  cycleDayNumber: number;
  description?: string;
  workouts: Workout[];
}

export interface Program {
  _id?: ObjectId;
  userId: ObjectId;
  isActive: boolean;
  cycleLengthDays: number;
  startDate: Date;
  skipDayOffset: number;
  routines: Routine[];
}

export interface SkippedExercise {
  round: number;
  exerciseName: string;
  durationSec: number;
  timeSpentSec: number;
  timestamp: string;
}

export interface ActionLog {
  timestamp: string;
  action: string;
  detail?: string;
}

export type WorkoutLogStatus =
  | "completed"
  | "manually_marked"
  | "partially_completed"
  | "finished_early"
  | "skipped"
  | "discarded";

export interface WorkoutLog {
  _id?: ObjectId;
  userId: ObjectId;
  programId: ObjectId;
  workoutId: string;
  workoutName: string;
  cycleDayNumber: number;
  date: Date;
  status: WorkoutLogStatus;
  totalPlannedSec: number;
  totalCompletedSec: number;
  completionPercentage: number;
  skippedExercises: SkippedExercise[];
  actionLogs: ActionLog[];
}
