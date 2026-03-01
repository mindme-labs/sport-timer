"use server";

import { auth } from "@/lib/auth";
import { createProgram } from "@/lib/db/programs";
import type { Routine } from "@/lib/types";

export async function createProgramAction(data: {
  cycleLengthDays: number;
  routines: Routine[];
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  await createProgram(session.user.id, data);
}
