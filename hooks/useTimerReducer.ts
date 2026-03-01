import type { Workout, Exercise, ActionLog, SkippedExercise } from "@/lib/types";

export type TimerPhase =
  | "idle"
  | "exercising"
  | "resting"
  | "roundResting"
  | "paused"
  | "completed"
  | "stopped";

export type TimerSection = "preparation" | "main" | "coolDown";

export interface TimerState {
  phase: TimerPhase;
  section: TimerSection;
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
  const prepTime = (workout.preparation ?? []).reduce((s, e) => s + e.durationSec, 0);
  const mainTime = workout.exercises.reduce((s, e) => s + e.durationSec, 0) * workout.rounds;
  const coolTime = (workout.coolDown ?? []).reduce((s, e) => s + e.durationSec, 0);
  return prepTime + mainTime + coolTime;
}

function now(): string {
  return new Date().toISOString();
}

function getExercisesForSection(workout: Workout, section: TimerSection): Exercise[] {
  if (section === "preparation") return workout.preparation ?? [];
  if (section === "coolDown") return workout.coolDown ?? [];
  return workout.exercises;
}

function sectionLabel(section: TimerSection): string {
  if (section === "preparation") return "Preparation";
  if (section === "coolDown") return "Cool Down";
  return "";
}

function transitionToNextSection(state: TimerState): TimerState {
  const workout = state.workout!;

  if (state.section === "preparation") {
    const log: ActionLog = { timestamp: now(), action: "preparation_complete" };
    return {
      ...state,
      section: "main",
      currentRound: 0,
      currentExercise: 0,
      phase: "exercising",
      secondsRemaining: workout.exercises[0].durationSec,
      actionLogs: [...state.actionLogs, log],
    };
  }

  if (state.section === "main") {
    const coolDown = workout.coolDown ?? [];
    if (coolDown.length > 0) {
      const log: ActionLog = { timestamp: now(), action: "cooldown_started" };
      return {
        ...state,
        section: "coolDown",
        currentRound: 0,
        currentExercise: 0,
        phase: "exercising",
        secondsRemaining: coolDown[0].durationSec,
        actionLogs: [...state.actionLogs, log],
      };
    }
  }

  return {
    ...state,
    phase: "completed",
    secondsRemaining: 0,
    actionLogs: [...state.actionLogs, { timestamp: now(), action: "finished" }],
  };
}

function advanceExercise(state: TimerState): TimerState {
  const workout = state.workout!;
  const exercises = getExercisesForSection(workout, state.section);
  const nextExIdx = state.currentExercise + 1;

  if (nextExIdx < exercises.length) {
    return {
      ...state,
      phase: "exercising",
      currentExercise: nextExIdx,
      secondsRemaining: exercises[nextExIdx].durationSec,
    };
  }

  if (state.section === "main") {
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
        secondsRemaining: workout.exercises[0].durationSec,
      };
    }
  }

  return transitionToNextSection(state);
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

function getFirstSection(workout: Workout): { section: TimerSection; exercises: Exercise[] } {
  const prep = workout.preparation ?? [];
  if (prep.length > 0) return { section: "preparation", exercises: prep };
  return { section: "main", exercises: workout.exercises };
}

export function timerReducer(
  state: TimerState,
  action: TimerAction
): TimerState {
  switch (action.type) {
    case "START": {
      const workout = action.workout;
      const { section, exercises } = getFirstSection(workout);
      return {
        phase: "exercising",
        section,
        pausedFrom: null,
        currentRound: 0,
        currentExercise: 0,
        secondsRemaining: exercises[0].durationSec,
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
        const exercises = getExercisesForSection(state.workout!, state.section);
        const exercise = exercises[state.currentExercise];
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
      const exercises = getExercisesForSection(workout, state.section);
      const exercise = exercises[state.currentExercise];

      const timeSpentSec =
        state.phase === "resting"
          ? exercise.durationSec
          : exercise.durationSec - state.secondsRemaining;
      const creditedTime = timeSpentSec >= 5 ? timeSpentSec : 0;

      const label = sectionLabel(state.section);
      const roundLabel = state.section === "main" ? `Round ${state.currentRound + 1}` : label;

      const skippedEntry: SkippedExercise = {
        round: state.section === "main" ? state.currentRound + 1 : 0,
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
            detail: `${exercise.name} (${roundLabel})${timeSpentSec >= 5 ? ` — ${timeSpentSec}s credited` : ""}`,
          },
        ],
      };

      const nextExIdx = state.currentExercise + 1;
      if (nextExIdx < exercises.length) {
        return {
          ...updatedState,
          phase: "exercising",
          currentExercise: nextExIdx,
          secondsRemaining: exercises[nextExIdx].durationSec,
        };
      }

      if (state.section === "main") {
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
      }

      return transitionToNextSection(updatedState);
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
  section: "main",
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
