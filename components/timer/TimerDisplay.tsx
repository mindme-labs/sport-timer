"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTimer } from "@/hooks/useTimer";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useAudioCues } from "@/hooks/useAudioCues";
import StopModal from "./StopModal";
import WakeLockBanner from "./WakeLockBanner";
import type { Workout, Exercise } from "@/lib/types";
import type { TimerPhase, TimerSection } from "@/hooks/useTimerReducer";

interface TimerDisplayProps {
  workout: Workout;
  programId: string;
  cycleDay: number;
  onSave: (data: {
    status: "completed" | "finished_early" | "discarded";
    totalPlannedSec: number;
    totalCompletedSec: number;
    completionPercentage: number;
    skippedExercises: any[];
    actionLogs: any[];
  }) => Promise<void>;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}`;
}

function getBackgroundClass(phase: TimerPhase, section: TimerSection, showStopModal: boolean): string {
  if (showStopModal) return "bg-red-600";
  if (section === "preparation" && (phase === "exercising" || phase === "paused"))
    return "bg-teal-600";
  if (section === "coolDown" && (phase === "exercising" || phase === "paused"))
    return "bg-indigo-600";
  switch (phase) {
    case "exercising":
      return "bg-emerald-600";
    case "resting":
    case "roundResting":
      return "bg-amber-500";
    case "paused":
      return "bg-amber-500";
    case "completed":
      return "bg-emerald-600";
    default:
      return "bg-background";
  }
}

function getExercisesForSection(workout: Workout, section: TimerSection): Exercise[] {
  if (section === "preparation") return workout.preparation ?? [];
  if (section === "coolDown") return workout.coolDown ?? [];
  return workout.exercises;
}

function getSectionLabel(section: TimerSection): string {
  if (section === "preparation") return "Preparation";
  if (section === "coolDown") return "Cool Down";
  return "";
}

export default function TimerDisplay({
  workout,
  programId,
  cycleDay,
  onSave,
}: TimerDisplayProps) {
  const router = useRouter();
  const { state, startTimer, pause, resume, skipExercise, stop } = useTimer();
  const { isSupported, acquire, release } = useWakeLock();
  const { playCountdownBeep, playExerciseSwitchBeep } = useAudioCues();
  const [showStopModal, setShowStopModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [skipFlash, setSkipFlash] = useState(false);
  const prevPhaseRef = useRef<TimerPhase>("idle");
  const prevExerciseRef = useRef(0);
  const prevRoundRef = useRef(0);

  useEffect(() => {
    startTimer(workout);
    acquire();
    return () => {
      release();
    };
  }, [workout, startTimer, acquire, release]);

  useEffect(() => {
    const { phase, secondsRemaining } = state;
    if (phase === "exercising" && secondsRemaining <= 3 && secondsRemaining > 0) {
      playCountdownBeep();
    }
  }, [state.secondsRemaining, state.phase, playCountdownBeep]);

  useEffect(() => {
    if (
      state.phase === "exercising" &&
      (prevPhaseRef.current === "resting" ||
        prevPhaseRef.current === "roundResting" ||
        prevExerciseRef.current !== state.currentExercise ||
        prevRoundRef.current !== state.currentRound)
    ) {
      if (prevPhaseRef.current !== "idle") {
        playExerciseSwitchBeep();
      }
    }
    prevPhaseRef.current = state.phase;
    prevExerciseRef.current = state.currentExercise;
    prevRoundRef.current = state.currentRound;
  }, [state.phase, state.currentExercise, state.currentRound, playExerciseSwitchBeep]);

  useEffect(() => {
    if (state.phase === "completed" || state.phase === "stopped") {
      release();
      handleFinish();
    }
  }, [state.phase]);

  async function handleFinish() {
    if (saving) return;
    setSaving(true);

    let status: "completed" | "finished_early" | "discarded";
    if (state.phase === "completed") {
      status = "completed";
    } else {
      const lastAction = state.actionLogs[state.actionLogs.length - 1];
      status = lastAction?.action === "discarded" ? "discarded" : "finished_early";
    }

    if (status === "discarded") {
      router.replace("/dashboard");
      return;
    }

    const completionPercentage =
      state.totalPlannedSec > 0
        ? Math.round((state.totalCompletedSec / state.totalPlannedSec) * 1000) / 10
        : 100;

    try {
      await onSave({
        status,
        totalPlannedSec: state.totalPlannedSec,
        totalCompletedSec: state.totalCompletedSec,
        completionPercentage,
        skippedExercises: state.skippedExercises,
        actionLogs: state.actionLogs,
      });
    } finally {
      router.replace("/dashboard");
    }
  }

  function handleSkipExercise() {
    skipExercise();
    setSkipFlash(true);
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(200);
    }
    setTimeout(() => setSkipFlash(false), 300);
  }

  function handleStopSave() {
    setShowStopModal(false);
    stop("finished_early");
  }

  function handleStopDiscard() {
    setShowStopModal(false);
    stop("discarded");
  }

  if (state.phase === "idle") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (saving) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-emerald-600 text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
        <p className="mt-4 text-lg font-medium">Saving workout...</p>
      </div>
    );
  }

  const section = state.section;
  const exercises = getExercisesForSection(workout, section);
  const currentExercise = exercises[state.currentExercise];
  const nextExIdx = state.currentExercise + 1;
  const nextExerciseName =
    nextExIdx < exercises.length
      ? exercises[nextExIdx].name
      : section === "main" && state.currentRound + 1 < workout.rounds
        ? exercises[0].name
        : null;

  const isResting = state.phase === "resting" || state.phase === "roundResting";
  const isPaused = state.phase === "paused";
  const bgClass = getBackgroundClass(state.phase, section, showStopModal);
  const sectionLabel = getSectionLabel(section);

  const progressPercent =
    state.totalPlannedSec > 0
      ? (state.totalCompletedSec / state.totalPlannedSec) * 100
      : 0;

  return (
    <div
      className={`flex min-h-dvh flex-col transition-colors duration-300 ${bgClass} ${
        skipFlash ? "!bg-white" : ""
      }`}
    >
      {!isSupported && <WakeLockBanner />}

      <div className="flex items-center justify-between px-4 pt-4 text-white/80">
        <div className="text-sm font-medium">
          {sectionLabel || `Round ${state.currentRound + 1}/${workout.rounds}`}
        </div>
        <div className="text-sm font-medium">
          Exercise {state.currentExercise + 1}/{exercises.length}
        </div>
      </div>

      <div className="mx-4 mt-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white/60 transition-all duration-300"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        {isResting && (
          <p className="mb-2 text-lg font-medium text-white/70">
            {state.phase === "roundResting" ? "Round Rest" : "Rest"}
          </p>
        )}

        <p className="mb-2 text-center text-2xl font-bold text-white sm:text-3xl">
          {isResting
            ? nextExerciseName
              ? `Next: ${nextExerciseName}`
              : "Final rest"
            : currentExercise?.name}
        </p>

        {!isResting && currentExercise?.description && (
          <p className="mb-4 text-center text-sm text-white/70">
            {currentExercise.description}
          </p>
        )}

        <div className="text-[8rem] font-bold leading-none tracking-tighter text-white sm:text-[10rem]">
          {formatTime(state.secondsRemaining)}
        </div>

        {isPaused && (
          <p className="mt-4 text-xl font-semibold text-white/80">PAUSED</p>
        )}
      </div>

      <div className="flex gap-3 px-4 pb-8 pt-4">
        <button
          onClick={() => setShowStopModal(true)}
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-white active:bg-white/30"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
        </button>

        <button
          onClick={isPaused ? resume : pause}
          className="flex h-16 flex-1 items-center justify-center rounded-2xl bg-white/20 text-lg font-bold text-white active:bg-white/30"
        >
          {isPaused ? "RESUME" : "PAUSE"}
        </button>

        <button
          onClick={handleSkipExercise}
          disabled={isResting && state.phase === "roundResting"}
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-white active:bg-white/30 disabled:opacity-30"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,4 15,12 5,20" />
            <rect x="17" y="4" width="2" height="16" />
          </svg>
        </button>
      </div>

      {showStopModal && (
        <StopModal
          onSaveFinish={handleStopSave}
          onDiscard={handleStopDiscard}
          onCancel={() => setShowStopModal(false)}
        />
      )}
    </div>
  );
}
