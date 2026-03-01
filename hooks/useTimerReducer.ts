import type { Workout, ActionLog, SkippedExercise } from "@/lib/types";

export type TimerPhase =
  | "idle"
  | "exercising"
  | "resting"
  | "roundResting"
  | "paused"
  | "completed"
  | "stopped";

export interface TimerState {
  phase: TimerPhase;
  pausedFrom: "exercising" | "resting" | "roundResting" | null;
  currentRound: number;
  currentExercise: number;
  secondsRemaining: number;
  actionLogs: ActionLog[];
  skippedExercises: SkippedExercise[];
  totalCompletedSec: number;
  totalPlannedSec: number;
  workout: Workout | null;
}

export type TimerAction =
  | { type: "START"; workout: Workout }
  | { type: "TICK" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "SKIP_EXERCISE" }
  | { type: "STOP"; saveStatus: "finished_early" | "discarded" }
  | { type: "COMPLETE" };

function calcTotalPlannedSec(workout: Workout): number {
  return (
    workout.exercises.reduce((sum, e) => sum + e.durationSec, 0) *
    workout.rounds
  );
}

function now(): string {
  return new Date().toISOString();
}

function advanceExercise(state: TimerState): TimerState {
  const workout = state.workout!;
  const exercises = workout.exercises;
  const nextExIdx = state.currentExercise + 1;

  if (nextExIdx < exercises.length) {
    return {
      ...state,
      phase: "exercising",
      currentExercise: nextExIdx,
      secondsRemaining: exercises[nextExIdx].durationSec,
    };
  }

  const nextRound = state.currentRound + 1;
  if (nextRound < workout.rounds) {
    if (workout.restAfterRoundSec > 0) {
      return {
        ...state,
        phase: "roundResting",
        secondsRemaining: workout.restAfterRoundSec,
      };
    }
    return {
      ...state,
      phase: "exercising",
      currentRound: nextRound,
      currentExercise: 0,
      secondsRemaining: exercises[0].durationSec,
    };
  }

  return {
    ...state,
    phase: "completed",
    secondsRemaining: 0,
    actionLogs: [...state.actionLogs, { timestamp: now(), action: "finished" }],
  };
}

function advanceRound(state: TimerState): TimerState {
  const workout = state.workout!;
  const nextRound = state.currentRound + 1;
  return {
    ...state,
    phase: "exercising",
    currentRound: nextRound,
    currentExercise: 0,
    secondsRemaining: workout.exercises[0].durationSec,
  };
}

export function timerReducer(
  state: TimerState,
  action: TimerAction
): TimerState {
  switch (action.type) {
    case "START": {
      const workout = action.workout;
      return {
        phase: "exercising",
        pausedFrom: null,
        currentRound: 0,
        currentExercise: 0,
        secondsRemaining: workout.exercises[0].durationSec,
        actionLogs: [{ timestamp: now(), action: "started" }],
        skippedExercises: [],
        totalCompletedSec: 0,
        totalPlannedSec: calcTotalPlannedSec(workout),
        workout,
      };
    }

    case "TICK": {
      if (
        state.phase !== "exercising" &&
        state.phase !== "resting" &&
        state.phase !== "roundResting"
      ) {
        return state;
      }

      const nextSeconds = state.secondsRemaining - 1;

      if (nextSeconds > 0) {
        return { ...state, secondsRemaining: nextSeconds };
      }

      if (state.phase === "exercising") {
        const exercise = state.workout!.exercises[state.currentExercise];
        const updatedState = {
          ...state,
          totalCompletedSec: state.totalCompletedSec + exercise.durationSec,
        };

        if (exercise.restAfterSec > 0) {
          return {
            ...updatedState,
            phase: "resting" as TimerPhase,
            secondsRemaining: exercise.restAfterSec,
          };
        }
        return advanceExercise(updatedState);
      }

      if (state.phase === "resting") {
        return advanceExercise(state);
      }

      if (state.phase === "roundResting") {
        return advanceRound(state);
      }

      return state;
    }

    case "PAUSE": {
      if (
        state.phase !== "exercising" &&
        state.phase !== "resting" &&
        state.phase !== "roundResting"
      ) {
        return state;
      }
      return {
        ...state,
        phase: "paused",
        pausedFrom: state.phase as "exercising" | "resting" | "roundResting",
        actionLogs: [...state.actionLogs, { timestamp: now(), action: "paused" }],
      };
    }

    case "RESUME": {
      if (state.phase !== "paused" || !state.pausedFrom) return state;
      return {
        ...state,
        phase: state.pausedFrom,
        pausedFrom: null,
        actionLogs: [
          ...state.actionLogs,
          { timestamp: now(), action: "resumed" },
        ],
      };
    }

    case "SKIP_EXERCISE": {
      if (
        state.phase !== "exercising" &&
        state.phase !== "resting" &&
        state.phase !== "paused"
      ) {
        return state;
      }

      const workout = state.workout!;
      const exercise = workout.exercises[state.currentExercise];

      const timeSpentSec =
        state.phase === "resting"
          ? exercise.durationSec
          : exercise.durationSec - state.secondsRemaining;
      const creditedTime = timeSpentSec >= 5 ? timeSpentSec : 0;

      const skippedEntry: SkippedExercise = {
        round: state.currentRound + 1,
        exerciseName: exercise.name,
        durationSec: exercise.durationSec,
        timeSpentSec,
        timestamp: now(),
      };

      const updatedState: TimerState = {
        ...state,
        pausedFrom: null,
        totalCompletedSec: state.totalCompletedSec + creditedTime,
        skippedExercises: [...state.skippedExercises, skippedEntry],
        actionLogs: [
          ...state.actionLogs,
          {
            timestamp: now(),
            action: "skipped_exercise",
            detail: `${exercise.name} (Round ${state.currentRound + 1})${timeSpentSec >= 5 ? ` — ${timeSpentSec}s credited` : ""}`,
          },
        ],
      };

      const nextExIdx = state.currentExercise + 1;
      if (nextExIdx < workout.exercises.length) {
        return {
          ...updatedState,
          phase: "exercising",
          currentExercise: nextExIdx,
          secondsRemaining: workout.exercises[nextExIdx].durationSec,
        };
      }

      const nextRound = state.currentRound + 1;
      if (nextRound < workout.rounds) {
        if (workout.restAfterRoundSec > 0) {
          return {
            ...updatedState,
            phase: "roundResting",
            secondsRemaining: workout.restAfterRoundSec,
          };
        }
        return {
          ...updatedState,
          phase: "exercising",
          currentRound: nextRound,
          currentExercise: 0,
          secondsRemaining: workout.exercises[0].durationSec,
        };
      }

      return {
        ...updatedState,
        phase: "completed",
        secondsRemaining: 0,
        actionLogs: [
          ...updatedState.actionLogs,
          { timestamp: now(), action: "finished" },
        ],
      };
    }

    case "STOP": {
      const actionName =
        action.saveStatus === "finished_early"
          ? "stopped_early"
          : "discarded";
      return {
        ...state,
        phase: "stopped",
        pausedFrom: null,
        actionLogs: [
          ...state.actionLogs,
          { timestamp: now(), action: actionName },
        ],
      };
    }

    case "COMPLETE": {
      return {
        ...state,
        phase: "completed",
        secondsRemaining: 0,
        actionLogs: [
          ...state.actionLogs,
          { timestamp: now(), action: "finished" },
        ],
      };
    }

    default:
      return state;
  }
}

export const initialTimerState: TimerState = {
  phase: "idle",
  pausedFrom: null,
  currentRound: 0,
  currentExercise: 0,
  secondsRemaining: 0,
  actionLogs: [],
  skippedExercises: [],
  totalCompletedSec: 0,
  totalPlannedSec: 0,
  workout: null,
};
