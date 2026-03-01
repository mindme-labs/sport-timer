"use client";

import { useState } from "react";
import type { Routine, Workout, Exercise } from "@/lib/types";

interface ProgramFormProps {
  initialData?: {
    cycleLengthDays: number;
    routines: Routine[];
  };
  onSubmit: (data: { cycleLengthDays: number; routines: Routine[] }) => Promise<void>;
  submitLabel: string;
}

function generateId() {
  return "w" + Math.random().toString(36).substring(2, 9);
}

function createEmptyExercise(): Exercise {
  return { name: "", description: "", durationSec: 30, restAfterSec: 10 };
}

function createEmptyWorkout(): Workout {
  return {
    workoutId: generateId(),
    name: "",
    rounds: 3,
    restAfterRoundSec: 60,
    exercises: [createEmptyExercise()],
  };
}

export default function ProgramForm({
  initialData,
  onSubmit,
  submitLabel,
}: ProgramFormProps) {
  const [cycleLengthDays, setCycleLengthDays] = useState(
    initialData?.cycleLengthDays ?? 7
  );
  const [routines, setRoutines] = useState<Routine[]>(
    initialData?.routines ?? []
  );
  const [submitting, setSubmitting] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const allDays = Array.from({ length: cycleLengthDays }, (_, i) => i + 1);

  function getRoutineForDay(day: number): Routine | undefined {
    return routines.find((r) => r.cycleDayNumber === day);
  }

  function setRoutineForDay(day: number, workouts: Workout[], description?: string) {
    setRoutines((prev) => {
      const existing = prev.findIndex((r) => r.cycleDayNumber === day);
      const desc = description ?? prev.find((r) => r.cycleDayNumber === day)?.description ?? "";
      if (workouts.length === 0 && !desc) {
        return prev.filter((r) => r.cycleDayNumber !== day);
      }
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { cycleDayNumber: day, description: desc, workouts };
        return updated;
      }
      return [...prev, { cycleDayNumber: day, description: desc, workouts }];
    });
  }

  function setDayDescription(day: number, description: string) {
    setRoutines((prev) => {
      const existing = prev.findIndex((r) => r.cycleDayNumber === day);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], description };
        return updated;
      }
      return [...prev, { cycleDayNumber: day, description, workouts: [] }];
    });
  }

  function addWorkoutToDay(day: number) {
    const routine = getRoutineForDay(day);
    const workouts = routine ? [...routine.workouts, createEmptyWorkout()] : [createEmptyWorkout()];
    setRoutineForDay(day, workouts);
  }

  function removeWorkoutFromDay(day: number, workoutIndex: number) {
    const routine = getRoutineForDay(day);
    if (!routine) return;
    const workouts = routine.workouts.filter((_, i) => i !== workoutIndex);
    setRoutineForDay(day, workouts);
  }

  function updateWorkout(day: number, workoutIndex: number, updates: Partial<Workout>) {
    const routine = getRoutineForDay(day);
    if (!routine) return;
    const workouts = [...routine.workouts];
    workouts[workoutIndex] = { ...workouts[workoutIndex], ...updates };
    setRoutineForDay(day, workouts);
  }

  function updateExercise(
    day: number,
    workoutIndex: number,
    exerciseIndex: number,
    updates: Partial<Exercise>
  ) {
    const routine = getRoutineForDay(day);
    if (!routine) return;
    const workouts = [...routine.workouts];
    const exercises = [...workouts[workoutIndex].exercises];
    exercises[exerciseIndex] = { ...exercises[exerciseIndex], ...updates };
    workouts[workoutIndex] = { ...workouts[workoutIndex], exercises };
    setRoutineForDay(day, workouts);
  }

  function addExercise(day: number, workoutIndex: number) {
    const routine = getRoutineForDay(day);
    if (!routine) return;
    const workouts = [...routine.workouts];
    workouts[workoutIndex] = {
      ...workouts[workoutIndex],
      exercises: [...workouts[workoutIndex].exercises, createEmptyExercise()],
    };
    setRoutineForDay(day, workouts);
  }

  function removeExercise(day: number, workoutIndex: number, exerciseIndex: number) {
    const routine = getRoutineForDay(day);
    if (!routine) return;
    const workouts = [...routine.workouts];
    workouts[workoutIndex] = {
      ...workouts[workoutIndex],
      exercises: workouts[workoutIndex].exercises.filter((_, i) => i !== exerciseIndex),
    };
    setRoutineForDay(day, workouts);
  }

  function handleCycleLengthChange(newLength: number) {
    if (newLength < 1 || newLength > 31) return;
    setCycleLengthDays(newLength);
    setRoutines((prev) => prev.filter((r) => r.cycleDayNumber <= newLength));
  }

  async function handleSubmit() {
    const validRoutines = routines.filter(
      (r) =>
        r.workouts.length > 0 &&
        r.workouts.every(
          (w) =>
            w.name.trim() !== "" &&
            w.exercises.length > 0 &&
            w.exercises.every((e) => e.name.trim() !== "" && e.durationSec > 0)
        )
    );

    if (validRoutines.length === 0) {
      alert("Please add at least one workout day with exercises.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ cycleLengthDays, routines: validRoutines });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">
          Cycle Length (days)
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleCycleLengthChange(cycleLengthDays - 1)}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-xl font-bold active:bg-border"
          >
            −
          </button>
          <span className="min-w-[3rem] text-center text-2xl font-bold">
            {cycleLengthDays}
          </span>
          <button
            type="button"
            onClick={() => handleCycleLengthChange(cycleLengthDays + 1)}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-xl font-bold active:bg-border"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Schedule
        </h3>
        {allDays.map((day) => {
          const routine = getRoutineForDay(day);
          const isExpanded = expandedDay === day;
          const hasWorkouts = routine && routine.workouts.length > 0;

          return (
            <div
              key={day}
              className="overflow-hidden rounded-xl border border-border bg-muted/50"
            >
              <button
                type="button"
                onClick={() => setExpandedDay(isExpanded ? null : day)}
                className="flex w-full items-center justify-between px-4 py-3 text-left active:bg-muted"
              >
                <span className="font-semibold">Day {day}</span>
                <span
                  className={`text-sm ${
                    hasWorkouts ? "text-success" : "text-muted-foreground"
                  }`}
                >
                  {hasWorkouts
                    ? `${routine!.workouts.length} workout${routine!.workouts.length > 1 ? "s" : ""}`
                    : "Rest Day"}
                </span>
              </button>

              {isExpanded && (
                <div className="border-t border-border px-4 pb-4 pt-3">
                  <input
                    type="text"
                    placeholder="Day description (optional, e.g. 'Upper body focus')"
                    value={routine?.description ?? ""}
                    onChange={(e) => setDayDescription(day, e.target.value)}
                    className="mb-3 w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                  {routine?.workouts.map((workout, wi) => (
                    <div
                      key={workout.workoutId}
                      className="mb-4 rounded-lg border border-border bg-background p-3"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          Workout {wi + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeWorkoutFromDay(day, wi)}
                          className="text-xs text-destructive active:opacity-70"
                        >
                          Remove
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="Workout name"
                        value={workout.name}
                        onChange={(e) =>
                          updateWorkout(day, wi, { name: e.target.value })
                        }
                        className="mb-2 w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                      />
                      <textarea
                        placeholder="Workout description (optional, e.g. 'Focus on controlled reps')"
                        value={workout.description ?? ""}
                        onChange={(e) =>
                          updateWorkout(day, wi, { description: e.target.value })
                        }
                        rows={2}
                        className="mb-3 w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                      />

                      <div className="mb-3 flex gap-3">
                        <div className="flex-1">
                          <label className="mb-1 block text-xs text-muted-foreground">
                            Rounds
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={99}
                            value={workout.rounds}
                            onChange={(e) =>
                              updateWorkout(day, wi, {
                                rounds: parseInt(e.target.value) || 1,
                              })
                            }
                            className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="mb-1 block text-xs text-muted-foreground">
                            Rest between rounds (s)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={600}
                            value={workout.restAfterRoundSec}
                            onChange={(e) =>
                              updateWorkout(day, wi, {
                                restAfterRoundSec: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          Exercises
                        </span>
                        {workout.exercises.map((exercise, ei) => (
                          <div
                            key={ei}
                            className="flex flex-col gap-2 rounded-lg bg-muted p-2.5"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Exercise name"
                                value={exercise.name}
                                onChange={(e) =>
                                  updateExercise(day, wi, ei, {
                                    name: e.target.value,
                                  })
                                }
                                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                              />
                              {workout.exercises.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeExercise(day, wi, ei)}
                                  className="flex h-9 w-9 items-center justify-center rounded-lg text-destructive active:bg-destructive/10"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                            <input
                              type="text"
                              placeholder="Description (optional, e.g. 'Keep elbows tucked')"
                              value={exercise.description ?? ""}
                              onChange={(e) =>
                                updateExercise(day, wi, ei, {
                                  description: e.target.value,
                                })
                              }
                              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                            />
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="mb-0.5 block text-[10px] text-muted-foreground">
                                  Duration (s)
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  max={3600}
                                  value={exercise.durationSec}
                                  onChange={(e) =>
                                    updateExercise(day, wi, ei, {
                                      durationSec:
                                        parseInt(e.target.value) || 1,
                                    })
                                  }
                                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="mb-0.5 block text-[10px] text-muted-foreground">
                                  Rest after (s)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  max={600}
                                  value={exercise.restAfterSec}
                                  onChange={(e) =>
                                    updateExercise(day, wi, ei, {
                                      restAfterSec:
                                        parseInt(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addExercise(day, wi)}
                          className="mt-1 w-full rounded-lg border border-dashed border-border py-2 text-sm text-muted-foreground active:bg-muted"
                        >
                          + Add Exercise
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => addWorkoutToDay(day)}
                    className="w-full rounded-xl border border-dashed border-primary/50 py-3 text-sm font-medium text-primary active:bg-primary/10"
                  >
                    + Add Workout
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        disabled={submitting}
        onClick={handleSubmit}
        className="mt-2 w-full rounded-xl bg-primary py-4 text-lg font-semibold text-primary-foreground transition-opacity active:opacity-80 disabled:opacity-50"
      >
        {submitting ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}
