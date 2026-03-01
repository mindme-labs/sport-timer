import { ObjectId } from "mongodb";
import clientPromise from "../mongodb";
import type { Program, Routine } from "../types";

const DB_NAME = "sport-timer";

async function getCollection() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<Program>("programs");
}

export async function getActiveProgramByUserId(
  userId: string
): Promise<Program | null> {
  const col = await getCollection();
  return col.findOne({ userId: new ObjectId(userId), isActive: true });
}

export async function createProgram(
  userId: string,
  data: {
    cycleLengthDays: number;
    routines: Routine[];
  }
): Promise<Program> {
  const col = await getCollection();

  await col.updateMany(
    { userId: new ObjectId(userId), isActive: true },
    { $set: { isActive: false } }
  );

  const program: Program = {
    userId: new ObjectId(userId),
    isActive: true,
    cycleLengthDays: data.cycleLengthDays,
    startDate: new Date(),
    skipDayOffset: 0,
    routines: data.routines,
  };

  const result = await col.insertOne(program as any);
  return { ...program, _id: result.insertedId };
}

export async function updateProgram(
  programId: string,
  data: {
    cycleLengthDays: number;
    routines: Routine[];
  }
): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { _id: new ObjectId(programId) },
    {
      $set: {
        cycleLengthDays: data.cycleLengthDays,
        routines: data.routines,
      },
    }
  );
}

export async function incrementSkipDayOffset(
  programId: string
): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { _id: new ObjectId(programId) },
    { $inc: { skipDayOffset: 1 } }
  );
}

export async function completeCycle(
  programId: string,
  currentCycleDay: number,
  cycleLengthDays: number
): Promise<void> {
  const col = await getCollection();
  const daysToAdvance = cycleLengthDays - currentCycleDay + 1;
  await col.updateOne(
    { _id: new ObjectId(programId) },
    { $inc: { skipDayOffset: daysToAdvance } }
  );
}

export async function getProgramById(
  programId: string
): Promise<Program | null> {
  const col = await getCollection();
  return col.findOne({ _id: new ObjectId(programId) });
}
