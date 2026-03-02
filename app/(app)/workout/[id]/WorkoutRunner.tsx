"use client";

import { useState } from "react";
import Link from "next/link";
import TimerDisplay from "@/components/timer/TimerDisplay";
import { useAudioCues } from "@/hooks/useAudioCues";
import { saveWorkoutLogAction } from "./actions";
import type { Workout, Exercise } from "@/lib/types";

interface WorkoutRunnerProps {
  workout: Workout;
  programId: string;
  cycleDay: number;
}

function formatDuration(totalSec: number): string {
  if (totalSec < 60) return `${totalSec}s`;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export default function WorkoutRunner({
  workout,
  programId,
  cycleDay,
}: WorkoutRunnerProps) {
  const [started, setStarted] = useState(false);
  const { initAudio } = useAudioCues();

  if (started) {
    return (
      <TimerDisplay
        workout={workout}
        programId={programId}
        cycleDay={cycleDay}
        onSave={async (data) => {
          await saveWorkoutLogAction({
            programId,
            workoutId: workout.workoutId,
            workoutName: workout.name,
            cycleDayNumber: cycleDay,
            ...data,
          });
        }}
      />
    );
  }

  const prep = workout.preparation ?? [];
  const cool = workout.coolDown ?? [];
  const prepTime = prep.reduce((s, e) => s + e.durationSec + e.restAfterSec, 0);
  const coolTime = cool.reduce((s, e) => s + e.durationSec + e.restAfterSec, 0);
  const mainExerciseTime =
    workout.exercises.reduce((sum, e) => sum + e.durationSec, 0) * workout.rounds;
  const mainRestTime =
    workout.exercises.reduce((sum, e) => sum + e.restAfterSec, 0) * workout.rounds +
    workout.restAfterRoundSec * (workout.rounds - 1);
  const totalTime = prepTime + mainExerciseTime + mainRestTime + coolTime;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="flex items-center gap-3 px-4 pt-4">
        <Link
          href="/dashboard"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted active:bg-border"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <span className="text-sm text-muted-foreground">Day {cycleDay}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-32 pt-4">
        <h1 className="text-2xl font-bold">{workout.name}</h1>

        {workout.description && (
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {workout.description}
          </p>
        )}

        <div className="mt-4 flex gap-3">
          <div className="flex-1 rounded-xl bg-muted p-3 text-center">
            <p className="text-lg font-bold">{workout.rounds}</p>
            <p className="text-[11px] text-muted-foreground">
              Round{workout.rounds !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex-1 rounded-xl bg-muted p-3 text-center">
            <p className="text-lg font-bold">{workout.exercises.length}</p>
            <p className="text-[11px] text-muted-foreground">
              Exercise{workout.exercises.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex-1 rounded-xl bg-muted p-3 text-center">
            <p className="text-lg font-bold">~{Math.ceil(totalTime / 60)}</p>
            <p className="text-[11px] text-muted-foreground">Minutes</p>
          </div>
        </div>

        {workout.restAfterRoundSec > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            {formatDuration(workout.restAfterRoundSec)} rest between rounds
          </p>
        )}

        {prep.length > 0 && (
          <>
            <h2 className="mb-3 mt-6 text-sm font-semibold text-teal-600 dark:text-teal-400">
              Preparation
            </h2>
            <ExercisePreviewList exercises={prep} />
          </>
        )}

        <h2 className="mb-3 mt-6 text-sm font-semibold text-muted-foreground">
          Main Exercises{workout.rounds > 1 ? ` (×${workout.rounds} rounds)` : ""}
        </h2>
        <ExercisePreviewList exercises={workout.exercises} />

        {cool.length > 0 && (
          <>
            <h2 className="mb-3 mt-6 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              Cool Down
            </h2>
            <ExercisePreviewList exercises={cool} />
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background/95 px-4 pb-8 pt-4 backdrop-blur-sm">
        <button
          onClick={() => { initAudio(); setStarted(true); }}
          className="w-full rounded-2xl bg-primary py-4 text-xl font-bold text-primary-foreground active:opacity-80"
        >
          Start Workout
        </button>
      </div>
    </div>
  );
}

function ExercisePreviewList({ exercises }: { exercises: Exercise[] }) {
  return (
    <div className="flex flex-col gap-2">
      {exercises.map((exercise, i) => (
        <div key={i} className="rounded-xl border border-border p-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">{exercise.name}</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatDuration(exercise.durationSec)}</span>
              {exercise.restAfterSec > 0 && (
                <>
                  <span className="text-border">|</span>
                  <span>{exercise.restAfterSec}s rest</span>
                </>
              )}
            </div>
          </div>
          {exercise.description && (
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {exercise.description}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
