import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveProgramByUserId } from "@/lib/db/programs";
import { getCurrentCycleDay } from "@/lib/utils/cycleDay";
import WorkoutRunner from "./WorkoutRunner";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ day?: string }>;
}

export default async function WorkoutPage({ params, searchParams }: Props) {
  const { id: workoutId } = await params;
  const { day } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const program = await getActiveProgramByUserId(session.user.id);
  if (!program) redirect("/onboarding");

  let foundWorkout = null;
  let foundCycleDay = 0;

  for (const routine of program.routines) {
    for (const workout of routine.workouts) {
      if (workout.workoutId === workoutId) {
        foundWorkout = workout;
        foundCycleDay = routine.cycleDayNumber;
        break;
      }
    }
    if (foundWorkout) break;
  }

  if (!foundWorkout) redirect("/dashboard");

  const cycleDay = day
    ? parseInt(day, 10)
    : getCurrentCycleDay(
        program.startDate,
        program.cycleLengthDays,
        program.skipDayOffset
      );

  return (
    <WorkoutRunner
      workout={foundWorkout}
      programId={program._id!.toString()}
      cycleDay={foundCycleDay || cycleDay}
    />
  );
}
