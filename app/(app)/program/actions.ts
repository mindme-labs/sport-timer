"use server";

import { auth } from "@/lib/auth";
import {
  getActiveProgramByUserId,
  updateProgram,
  createProgram,
} from "@/lib/db/programs";
import type { Routine } from "@/lib/types";

export async function getProgramAction() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const program = await getActiveProgramByUserId(session.user.id);
  if (!program) return null;

  return {
    _id: program._id!.toString(),
    cycleLengthDays: program.cycleLengthDays,
    routines: program.routines,
  };
}

export async function updateProgramAction(
  programId: string,
  data: { cycleLengthDays: number; routines: Routine[] }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  await updateProgram(programId, data);
}

export async function createNewProgramAction(data: {
  cycleLengthDays: number;
  routines: Routine[];
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  await createProgram(session.user.id, data);
}
