import type { AppointmentStatus, AppointmentType, IntakeState } from "@carepath/shared/contracts";
import { weekdayNames, weekdayOrder } from "./format";

/** Plain words for the stored visit types and statuses. No raw enum reaches the screen. */
export const typeLabels: Record<AppointmentType, string> = {
  initial_evaluation: "Initial evaluation",
  follow_up: "Follow-up visit",
  video_follow_up: "Follow-up by video",
};

export const typeHints: Record<AppointmentType, string> = {
  initial_evaluation: "A first visit with your therapist to go over your goals and your plan.",
  follow_up: "A visit to check how your plan is going.",
  video_follow_up: "The same follow-up, held over video instead of in the clinic.",
};

export const statusLabels: Record<AppointmentStatus, string> = {
  requested: "Requested",
  booked: "Booked",
  checked_in: "Checked in",
  in_progress: "In progress",
  completed: "Completed",
  cancelled_by_patient: "Cancelled by you",
  cancelled_by_clinic: "Cancelled by the clinic",
  no_show: "Missed",
};

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
export function clinicHour(instant: string, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hourCycle: "h23",
    timeZone: timezone,
  }).formatToParts(new Date(instant));
  return Number(parts.find((p) => p.type === "hour")?.value ?? "0");
}

export function timeOfDay(instant: string, timezone: string): TimeOfDay {
  const h = clinicHour(instant, timezone);
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

/** "8:00 AM" in the clinic's zone. */
export function formatClock(instant: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(instant));
}

/** "Mountain Standard Time" for the zone at that instant, so the zone is named in words. */
export function zoneName(timezone: string, instant?: string): string {
  const at = instant ? new Date(instant) : new Date("2026-01-15T12:00:00Z");
  const part = new Intl.DateTimeFormat("en-US", { timeZoneName: "long", timeZone: timezone })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? timezone;
}

export function minutesBetween(startsAt: string, endsAt: string): number {
  return Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000);
}

/** "8:00 to 8:45 AM" style range in the clinic's zone. */
export function formatRange(startsAt: string, endsAt: string, timezone: string): string {
  return `${formatClock(startsAt, timezone)} to ${formatClock(endsAt, timezone)}`;
}

/** Add days to a `YYYY-MM-DD` calendar date. */
export function addLocalDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Calendar days from one `YYYY-MM-DD` to another (to minus from). */
export function daysBetweenLocal(from: string, to: string): number {
  return Math.round(
    (new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / 86_400_000,
  );
}

/** "Monday, Wednesday and Friday" style list. */
export function listWords(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** The therapist's name without the credentials the API appends in appointment rows. */
export function firstPart(name: string): string {
  return name.split(",")[0]!.trim();
}

/** The calendar day (`YYYY-MM-DD`) of an instant in the clinic's zone. */
export function clinicDate(instant: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: timezone,
  }).format(new Date(instant));
}

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
