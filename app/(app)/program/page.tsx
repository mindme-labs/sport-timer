"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProgramForm from "@/components/program/ProgramForm";
import { getProgramAction, updateProgramAction, createNewProgramAction } from "./actions";
import type { Routine } from "@/lib/types";

interface ProgramData {
  _id: string;
  cycleLengthDays: number;
  routines: Routine[];
}

export default function ProgramPage() {
  const router = useRouter();
  const [program, setProgram] = useState<ProgramData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"edit" | "new">("edit");

  useEffect(() => {
    getProgramAction().then((p) => {
      if (p) {
        setProgram(p);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {mode === "edit" ? "Edit Program" : "New Program"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "edit"
              ? "Modify your active workout program."
              : "Create a new program. Your previous history is preserved."}
          </p>
        </div>
        {program && (
          <button
            type="button"
            onClick={() => setMode(mode === "edit" ? "new" : "edit")}
            className="rounded-lg bg-muted px-3 py-2 text-xs font-medium active:bg-border"
          >
            {mode === "edit" ? "New" : "Edit"}
          </button>
        )}
      </div>

      <ProgramForm
        key={mode}
        initialData={
          mode === "edit" && program
            ? {
                cycleLengthDays: program.cycleLengthDays,
                routines: program.routines,
              }
            : undefined
        }
        submitLabel={mode === "edit" ? "Save Changes" : "Create New Program"}
        onSubmit={async (data) => {
          if (mode === "edit" && program) {
            await updateProgramAction(program._id, data);
          } else {
            await createNewProgramAction(data);
          }
          router.push("/dashboard");
        }}
      />
    </div>
  );
}
