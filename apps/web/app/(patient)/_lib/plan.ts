import type { CarePlanView } from "@carepath/shared/contracts";
import { weekdayNames, weekdayOfLocalDate } from "./format";

/** The next day after today on which the plan schedules exercises, by name. */
export function nextScheduledDay(plan: CarePlanView, today: string): string | null {
  const days = new Set(plan.items.flatMap((i) => i.schedule.daysOfWeek));
  if (days.size === 0) return null;
  const todayDow = weekdayOfLocalDate(today);
  for (let step = 1; step <= 7; step++) {
    const d = (todayDow + step) % 7;
    if (days.has(d)) return weekdayNames[d]!;
  }
  return null;
}

/** Exercises the session will cover today: the same rule the API applies when it starts one. */
export function todaysItems(plan: CarePlanView, date: string) {
  const dow = weekdayOfLocalDate(date);
  const scheduled = plan.items.filter((i) => i.schedule.daysOfWeek.includes(dow));
  return scheduled.length > 0 ? scheduled : plan.items;
}
