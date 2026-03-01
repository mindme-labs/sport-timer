"use client";

import { useReducer, useRef, useCallback, useEffect } from "react";
import {
  timerReducer,
  initialTimerState,
  type TimerAction,
} from "./useTimerReducer";
import type { Workout } from "@/lib/types";

export function useTimer() {
  const [state, dispatch] = useReducer(timerReducer, initialTimerState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef(state);

  stateRef.current = state;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(
    (workout: Workout) => {
      clearTimer();
      dispatch({ type: "START", workout });
    },
    [clearTimer]
  );

  useEffect(() => {
    const phase = state.phase;

    if (
      phase === "exercising" ||
      phase === "resting" ||
      phase === "roundResting"
    ) {
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          dispatch({ type: "TICK" });
        }, 1000);
      }
    } else {
      clearTimer();
    }

    return () => {};
  }, [state.phase, clearTimer]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const pause = useCallback(() => dispatch({ type: "PAUSE" }), []);
  const resume = useCallback(() => dispatch({ type: "RESUME" }), []);
  const skipExercise = useCallback(
    () => dispatch({ type: "SKIP_EXERCISE" }),
    []
  );
  const stop = useCallback(
    (saveStatus: "finished_early" | "discarded") =>
      dispatch({ type: "STOP", saveStatus }),
    []
  );

  return {
    state,
    startTimer,
    pause,
    resume,
    skipExercise,
    stop,
    dispatch,
  };
}
