import { formatCalendarDay } from "./datetime.js";
import { ofTotal, outOfTotal } from "./number.js";

/**
 * One way to print a pain value (CD-220). No colour, icon or band word by value (R4). Staff always
 * see it labelled as patient-reported; patients see "7 of 10" in lists and "pain of 7 out of 10" in
 * sentences.
 */
export const PATIENT_REPORTED = "patient-reported";

/** "Pain 7 of 10 (patient-reported)", or with a day: "Pain 7 of 10 (patient-reported), Nov 19". */
export function painStaffText(score: number, day?: string): string {
  const base = `Pain ${ofTotal(score, 10)} (${PATIENT_REPORTED})`;
  return day ? `${base}, ${formatCalendarDay(day, "short")}` : base;
}

/** "7 of 10", for lists in the patient app. */
export function painPatientListText(score: number): string {
  return ofTotal(score, 10);
}

/** "pain of 7 out of 10", for patient sentences. */
export function painPatientSentenceText(score: number): string {
  return `pain of ${outOfTotal(score, 10)}`;
}
