import { ObjectId } from "mongodb";
import clientPromise from "../mongodb";
import type { WorkoutLog } from "../types";

const DB_NAME = "sport-timer";

async function getCollection() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<WorkoutLog>("workoutLogs");
}

export async function createWorkoutLog(
  log: Omit<WorkoutLog, "_id">
): Promise<WorkoutLog> {
  const col = await getCollection();
  const result = await col.insertOne(log as any);
  return { ...log, _id: result.insertedId };
}

export async function getLogsByUserId(userId: string): Promise<WorkoutLog[]> {
  const col = await getCollection();
  return col
    .find({ userId: new ObjectId(userId) })
    .sort({ date: -1 })
    .toArray() as Promise<WorkoutLog[]>;
}

export async function getLogsByDate(
  userId: string,
  date: Date
): Promise<WorkoutLog[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const col = await getCollection();
  return col
    .find({
      userId: new ObjectId(userId),
      date: { $gte: startOfDay, $lte: endOfDay },
    })
    .toArray() as Promise<WorkoutLog[]>;
}

export async function upsertWorkoutLog(
  log: Omit<WorkoutLog, "_id">
): Promise<void> {
  const col = await getCollection();
  const startOfDay = new Date(log.date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(log.date);
  endOfDay.setHours(23, 59, 59, 999);

  await col.replaceOne(
    {
      userId: log.userId,
      workoutId: log.workoutId,
      date: { $gte: startOfDay, $lte: endOfDay },
    },
    log as any,
    { upsert: true }
  );
}

export async function getLogsByDateRange(
  userId: string,
  from: Date,
  to: Date
): Promise<WorkoutLog[]> {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);

  const col = await getCollection();
  return col
    .find({
      userId: new ObjectId(userId),
      date: { $gte: start, $lte: end },
    })
    .sort({ date: -1 })
    .toArray() as Promise<WorkoutLog[]>;
}

export async function getTodaysLogsByWorkoutId(
  userId: string,
  workoutId: string
): Promise<WorkoutLog[]> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const col = await getCollection();
  return col
    .find({
      userId: new ObjectId(userId),
      workoutId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ["discarded"] },
    })
    .toArray() as Promise<WorkoutLog[]>;
}
