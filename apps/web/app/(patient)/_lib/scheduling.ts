import {
  addDays,
  appointmentStatusLabel,
  appointmentTypeLabels,
  daysBetween,
  hourOf,
  formatTime,
  formatTimeRange,
  listWords as sharedListWords,
  localDayOf,
  zoneName as sharedZoneName,
} from "@carepath/shared";
import {
  appointmentStatuses,
  type AppointmentStatus,
  type AppointmentType,
  type IntakeState,
} from "@carepath/shared/contracts";
import { weekdayNames, weekdayOrder } from "./format";

/** Plain words for the stored visit types and statuses. No raw enum reaches the screen. */
export const typeLabels: Record<AppointmentType, string> = appointmentTypeLabels;

export const typeHints: Record<AppointmentType, string> = {
  initial_evaluation: "A first visit with your therapist to go over your goals and your plan.",
  follow_up: "A visit to check how your plan is going.",
  video_follow_up: "The same follow-up, held over video instead of in the clinic.",
};

/** Patient wording of every status (shared map, CD-233). */
export const statusLabels = Object.fromEntries(
  appointmentStatuses.map((s) => [s, appointmentStatusLabel(s, "patient")]),
) as Record<AppointmentStatus, string>;

/** Weekday names in the order the filter shows them, Monday first. */
export const filterDays = weekdayOrder.map((d) => ({ value: d, label: weekdayNames[d]! }));

export type TimeOfDay = "morning" | "afternoon" | "evening";
export const timeOfDayLabels: Record<TimeOfDay, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};
export const timeOfDayHints: Record<TimeOfDay, string> = {
  morning: "before noon",
  afternoon: "noon to 5 pm",
  evening: "5 pm or later",
};

/** The hour of an instant in the clinic's zone (0 to 23). */
export const clinicHour = hourOf;

export function timeOfDay(instant: string, timezone: string): TimeOfDay {
  const h = clinicHour(instant, timezone);
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

/** "8:00 AM" in the clinic's zone. */
export const formatClock = formatTime;

/** "Mountain Standard Time" for the zone at that instant, so the zone is named in words. */
export const zoneName = sharedZoneName;

export function minutesBetween(startsAt: string, endsAt: string): number {
  return Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000);
}

/** "8:00 AM to 8:45 AM" range in the clinic's zone. */
export const formatRange = formatTimeRange;

/** Add days to a `YYYY-MM-DD` calendar date. */
export const addLocalDays = addDays;

/** Calendar days from one `YYYY-MM-DD` to another (to minus from). */
export const daysBetweenLocal = daysBetween;

/** "Monday, Wednesday and Friday" style list. */
export const listWords = sharedListWords;

/** The therapist's name without the credentials the API appends in appointment rows. */
export function firstPart(name: string): string {
  return name.split(",")[0]!.trim();
}

/** The calendar day (`YYYY-MM-DD`) of an instant in the clinic's zone. */
export const clinicDate = localDayOf;

/** The patient's stored intake availability, or null when it is missing or unreadable. Never asked again. */
export function availabilityFromIntake(
  intake: IntakeState,
): { days: number[]; times: TimeOfDay[] } | null {
  const step = intake.steps.find((s) => s.step === "appointment_availability");
  const a = step?.answers as { days?: unknown; times?: unknown } | null | undefined;
  if (!a || !Array.isArray(a.days) || !Array.isArray(a.times)) return null;
  const days = a.days.filter((d): d is number => typeof d === "number");
  const times = a.times.filter(
    (t): t is TimeOfDay => t === "morning" || t === "afternoon" || t === "evening",
  );
  return days.length > 0 && times.length > 0 ? { days, times } : null;
}
