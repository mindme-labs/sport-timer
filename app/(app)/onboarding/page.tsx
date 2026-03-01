"use client";

import { useRouter } from "next/navigation";
import ProgramForm from "@/components/program/ProgramForm";
import { createProgramAction } from "./actions";

export default function OnboardingPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create Your Program</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up your workout cycle. Days without workouts become rest days.
        </p>
      </div>

      <ProgramForm
        submitLabel="Create Program"
        onSubmit={async (data) => {
          await createProgramAction(data);
          router.replace("/dashboard");
        }}
      />
    </div>
  );
}
