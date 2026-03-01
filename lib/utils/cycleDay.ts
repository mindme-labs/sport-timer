export function getCurrentCycleDay(
  startDate: Date,
  cycleLengthDays: number,
  skipDayOffset: number
): number {
  const now = new Date();
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const cycleDay = ((diffDays + skipDayOffset) % cycleLengthDays) + 1;
  return cycleDay;
}

/**
 * Returns the start date of the current cycle iteration as a Date.
 * E.g., if today is Day 3 of a 7-day cycle, returns the date that was Day 1.
 */
export function getCurrentCycleStartDate(
  startDate: Date,
  cycleLengthDays: number,
  skipDayOffset: number
): Date {
  const today = getCurrentCycleDay(startDate, cycleLengthDays, skipDayOffset);
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (today - 1));
  return d;
}

/**
 * Returns the calendar date for a given cycle day number within the current cycle.
 */
export function getDateForCycleDay(
  cycleStartDate: Date,
  cycleDayNumber: number
): Date {
  const d = new Date(cycleStartDate);
  d.setDate(d.getDate() + (cycleDayNumber - 1));
  return d;
}
