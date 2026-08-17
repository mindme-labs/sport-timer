import { createProgram } from "@/lib/db/programs";
import programV3 from "@/docs/program-v3.json";
import type { Routine } from "@/lib/types";

const IMPORT_USER_ID = "69a48baa4233c41dd7f314ac";

function getImportSecret(): string | undefined {
  return process.env.IMPORT_SECRET ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
}

export async function POST(request: Request) {
  const secret = getImportSecret();
  const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!secret || auth !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const program = await createProgram(IMPORT_USER_ID, {
    cycleLengthDays: programV3.cycleLengthDays,
    routines: programV3.routines as Routine[],
  });

  return Response.json({
    ok: true,
    programId: program._id?.toString(),
    days: programV3.routines.map(
      (r) => `${r.cycleDayNumber}: ${r.workouts[0]?.name ?? "отдых"}`
    ),
  });
}
