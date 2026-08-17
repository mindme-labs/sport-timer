"use client";

import { useEffect } from "react";
import { getExerciseGuide } from "@/lib/exerciseGuide";

interface ExerciseHelpSheetProps {
  name: string;
  description?: string;
  onClose: () => void;
}

export default function ExerciseHelpSheet({
  name,
  description,
  onClose,
}: ExerciseHelpSheetProps) {
  const guide = getExerciseGuide(name);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Как делать: ${name}`}
    >
      <div
        className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-background p-5 pb-10 text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />

        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold leading-tight">{name}</h2>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground active:bg-border"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {guide ? (
          <div className="mt-4 flex flex-col gap-4">
            <HelpRow label="Исходное положение" text={guide.start} />
            <HelpRow label="Как делать" text={guide.how} />
            <HelpRow label="Дыхание" text={guide.breathing} />
            <HelpRow label="Частые ошибки" text={guide.mistakes} />
            <HelpRow label="Если тяжело" text={guide.easier} />
            <HelpRow label="Зачем" text={guide.purpose} />
          </div>
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {description || "Справка для этого упражнения пока не добавлена."}
          </p>
        )}
      </div>
    </div>
  );
}

function HelpRow({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm leading-relaxed">{text}</p>
    </div>
  );
}
