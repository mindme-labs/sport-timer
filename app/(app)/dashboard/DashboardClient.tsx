"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Workout, Routine } from "@/lib/types";
import SkipDayButton from "@/components/dashboard/SkipDayButton";
import MarkCompleteButton from "@/components/dashboard/MarkCompleteButton";
import InstallPrompt from "@/components/InstallPrompt";
import CompleteCycleButton from "@/components/dashboard/CompleteCycleButton";

interface SerializedLog {
  _id: string;
  userId: string;
  programId: string;
  workoutId: string;
  workoutName: string;
  cycleDayNumber: number;
  date: string;
  status: string;
  totalPlannedSec: number;
  totalCompletedSec: number;
  completionPercentage: number;
  skippedExercises: any[];
  actionLogs: any[];
}

interface DashboardClientProps {
  cycleDay: number;
  cycleLengthDays: number;
  cycleStartDate: string;
  routines: Routine[];
  cycleLogs: SerializedLog[];
  programId: string;
  userName: string;
}

function getDayStatus(
  day: number,
  currentDay: number,
  routine: Routine | undefined,
  logs: SerializedLog[]
): "completed" | "rest" | "upcoming" | "today" | "missed" | "partial" {
  const hasWorkouts = routine && routine.workouts.length > 0;
  if (!hasWorkouts) return "rest";
  if (day === currentDay) return "today";

  const dayLogs = logs.filter(
    (l) =>
      l.cycleDayNumber === day &&
      l.status !== "discarded" &&
      l.status !== "skipped"
  );

  if (day > currentDay) return "upcoming";

  if (!routine) return "rest";
  const allDone = routine.workouts.every((w) =>
    dayLogs.some((l) => l.workoutId === w.workoutId)
  );
  if (allDone) return "completed";
  if (dayLogs.length > 0) return "partial";
  return "missed";
}

export default function DashboardClient({
  cycleDay,
  cycleLengthDays,
  cycleStartDate,
  routines,
  cycleLogs,
  programId,
  userName,
}: DashboardClientProps) {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(cycleDay);

  const allDays = Array.from({ length: cycleLengthDays }, (_, i) => i + 1);

  const selectedRoutine = routines.find(
    (r) => r.cycleDayNumber === selectedDay
  );
  const selectedWorkouts = selectedRoutine?.workouts ?? [];
  const isRestDay = selectedWorkouts.length === 0;
  const isToday = selectedDay === cycleDay;

  const selectedDayLogs = cycleLogs.filter(
    (l) => l.cycleDayNumber === selectedDay
  );
  const completedWorkoutIds = selectedDayLogs
    .filter((l) => l.status !== "discarded" && l.status !== "skipped")
    .map((l) => l.workoutId);

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <InstallPrompt />

      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Hey, {userName.split(" ")[0] || "there"}
          </p>
          <h1 className="text-2xl font-bold">Your Cycle</h1>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="rounded-lg bg-muted px-3 py-2 text-xs font-medium text-muted-foreground active:bg-border"
        >
          Sign out
        </button>
      </div>

      {/* Cycle day selector */}
      <div className="mb-6 -mx-4 px-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {allDays.map((day) => {
            const routine = routines.find((r) => r.cycleDayNumber === day);
            const status = getDayStatus(day, cycleDay, routine, cycleLogs);
            const isSelected = day === selectedDay;

            let pillBg = "bg-muted text-muted-foreground";
            let dotColor = "";

            if (isSelected) {
              pillBg = "bg-primary text-primary-foreground";
            } else if (status === "completed") {
              dotColor = "bg-emerald-500";
            } else if (status === "partial") {
              dotColor = "bg-amber-500";
            } else if (status === "missed") {
              dotColor = "bg-red-400";
            } else if (status === "rest") {
              dotColor = "bg-muted-foreground/30";
            } else if (status === "upcoming") {
              pillBg = "bg-muted/60 text-muted-foreground/60";
            }

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`relative flex min-w-[3.2rem] flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-xs font-semibold transition-colors active:opacity-80 ${pillBg}`}
              >
                <span>{day}</span>
                {day === cycleDay && !isSelected && (
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                )}
                {day !== cycleDay && dotColor && !isSelected && (
                  <div className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                )}
                {isSelected && day === cycleDay && (
                  <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                )}
                {isSelected && day !== cycleDay && dotColor && (
                  <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground/60" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day header */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">Day {selectedDay}</h2>
          {isToday && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              Today
            </span>
          )}
        </div>
        {selectedRoutine?.description && (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {selectedRoutine.description}
          </p>
        )}
      </div>

      {/* Day content */}
      {isRestDay ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-muted p-8 text-center">
          <span className="text-5xl">🧘</span>
          <div>
            <h2 className="text-xl font-semibold">Day Off</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              No workouts scheduled for this day.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {selectedWorkouts.map((workout) => {
            const isDone = completedWorkoutIds.includes(workout.workoutId);
            const totalExercises = workout.exercises.length;
            const totalTime =
              workout.exercises.reduce((sum, e) => sum + e.durationSec, 0) *
              workout.rounds;

            return (
              <div
                key={workout.workoutId}
                className={`rounded-2xl border border-border p-4 ${
                  isDone ? "opacity-60" : ""
                }`}
              >
                <div className="mb-1 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{workout.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {workout.rounds} round
                      {workout.rounds !== 1 ? "s" : ""} · {totalExercises}{" "}
                      exercise
                      {totalExercises !== 1 ? "s" : ""} ·{" "}
                      {Math.ceil(totalTime / 60)} min
                    </p>
                  </div>
                  {isDone && (
                    <span className="rounded-full bg-success/20 px-2.5 py-1 text-xs font-medium text-success">
                      Done
                    </span>
                  )}
                </div>

                {workout.description && (
                  <p className="mb-3 text-xs text-muted-foreground leading-relaxed">
                    {workout.description}
                  </p>
                )}

                {!isDone ? (
                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/workout/${workout.workoutId}?day=${selectedDay}`}
                      className="flex flex-1 items-center justify-center rounded-xl bg-primary py-3.5 text-base font-semibold text-primary-foreground active:opacity-80"
                    >
                      View & Start
                    </Link>
                    <MarkCompleteButton
                      programId={programId}
                      workout={workout}
                      cycleDay={selectedDay}
                      onComplete={() => router.refresh()}
                    />
                  </div>
                ) : (
                  <Link
                    href={`/workout/${workout.workoutId}?day=${selectedDay}`}
                    className="mt-3 flex w-full items-center justify-center rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground active:bg-muted"
                  >
                    Restart Workout
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom actions */}
      <div className="mt-6 flex flex-col gap-3">
        {isToday && (
          <SkipDayButton
            programId={programId}
            cycleDay={cycleDay}
            onSkipped={() => router.refresh()}
          />
        )}
        <CompleteCycleButton
          programId={programId}
          onCompleted={() => router.refresh()}
        />
      </div>
    </div>
  );
}
