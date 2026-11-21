import type { activityLimitations } from "@carepath/shared/contracts";
import {
  bodyAreas,
  CONSENT_TEXT_VERSIONS,
  intakeSteps,
  type IntakeAnswers,
  type IntakeState,
  type IntakeStep,
} from "@carepath/shared/contracts";
import { checkDateOfBirth, type DateParts } from "@carepath/ui";
import { sentenceCase, weekdayNames } from "../../_lib/format";

/** Everything the onboarding form holds while the patient fills it in. Strings and booleans, as inputs give them. */
export interface OnboardingForm {
  personal: {
    givenName: string;
    familyName: string;
    birthDate: string;
    phone: string;
    preferredLanguage: "en" | "es";
  };
  goal: string;
  bodyArea: string;
  side: string;
  pain: { current: number | null; worst: number | null; best: number | null };
  limitations: string[];
  /** "None of these" ticked: the saved answer is an empty list, the same as skipping, but the patient said it. */
  limitationsNone: boolean;
  limitationsOther: string;
  preferences: { gender: string; language: string; notes: string };
  availability: { days: number[]; times: string[] };
  /** `ai` is null until the patient answers Yes or No: no preselected choice (CD-142). */
  consent: { agree: boolean; ai: boolean | null };
  confirmed: boolean;
}

export function emptyForm(): OnboardingForm {
  return {
    personal: { givenName: "", familyName: "", birthDate: "", phone: "", preferredLanguage: "en" },
    goal: "",
    bodyArea: "",
    side: "",
    pain: { current: null, worst: null, best: null },
    limitations: [],
    limitationsNone: false,
    limitationsOther: "",
    preferences: { gender: "no_preference", language: "no_preference", notes: "" },
    availability: { days: [], times: [] },
    consent: { agree: false, ai: null },
    confirmed: false,
  };
}

type Saved = Record<string, unknown> | null | undefined;

/** Stored answers back into the form, so resuming shows steps one to n exactly as they were left. */
export function formFromIntake(state: IntakeState): OnboardingForm {
  const form = emptyForm();
  const complete = new Set(state.steps.filter((x) => x.complete).map((x) => x.step));
  const get = (step: IntakeStep): Saved => state.steps.find((s) => s.step === step)?.answers;
  const p = get("personal_information") as
    Partial<IntakeAnswers["personal_information"]> | undefined | null;
  if (p) {
    form.personal = {
      givenName: p.givenName ?? "",
      familyName: p.familyName ?? "",
      birthDate: p.birthDate ?? "",
      phone: p.phone ?? "",
      preferredLanguage: p.preferredLanguage ?? "en",
    };
  }
  const g = get("primary_goal") as Partial<IntakeAnswers["primary_goal"]> | undefined | null;
  if (g?.goal) form.goal = g.goal;
  const b = get("body_area") as Partial<IntakeAnswers["body_area"]> | undefined | null;
  if (b) {
    form.bodyArea = b.bodyArea ?? "";
    form.side = b.side ?? "";
  }
  const pl = get("pain_levels") as Partial<IntakeAnswers["pain_levels"]> | undefined | null;
  if (pl) {
    form.pain = {
      current: pl.current ?? null,
      worst: pl.worstLastWeek ?? null,
      best: pl.bestLastWeek ?? null,
    };
  }
  const a = get("activity_limitations") as
    Partial<IntakeAnswers["activity_limitations"]> | undefined | null;
  if (a) {
    form.limitations = a.limitations ?? [];
    form.limitationsNone = complete.has("activity_limitations") && form.limitations.length === 0;
    form.limitationsOther = a.other ?? "";
  }
  const c = get("clinician_preferences") as
    Partial<IntakeAnswers["clinician_preferences"]> | undefined | null;
  if (c) {
    form.preferences = {
      gender: c.genderPreference ?? "no_preference",
      language: c.languagePreference ?? "no_preference",
      notes: c.notes ?? "",
    };
  }
  const av = get("appointment_availability") as
    Partial<IntakeAnswers["appointment_availability"]> | undefined | null;
  if (av) form.availability = { days: av.days ?? [], times: av.times ?? [] };
  const co = get("consent") as Partial<IntakeAnswers["consent"]> | undefined | null;
  if (co)
    form.consent = {
      agree: co.treatmentAndDataUse === true,
      ai: typeof co.aiAssistedFeatures === "boolean" ? co.aiAssistedFeatures : null,
    };
  return form;
}

/** The body the API stores for one step. Null when a required answer is still missing. */
export function payloadFor(step: IntakeStep, f: OnboardingForm): Record<string, unknown> | null {
  switch (step) {
    case "personal_information":
      return {
        givenName: f.personal.givenName.trim(),
        familyName: f.personal.familyName.trim(),
        birthDate: f.personal.birthDate,
        phone: f.personal.phone.trim() === "" ? null : f.personal.phone.trim(),
        preferredLanguage: f.personal.preferredLanguage,
      };
    case "primary_goal":
      return { goal: f.goal.trim() };
    case "body_area":
      return { bodyArea: f.bodyArea, side: f.side };
    case "pain_levels":
      return { current: f.pain.current, worstLastWeek: f.pain.worst, bestLastWeek: f.pain.best };
    case "activity_limitations":
      return {
        limitations: f.limitationsNone ? [] : f.limitations,
        other: f.limitationsOther.trim() === "" ? null : f.limitationsOther.trim(),
      };
    case "clinician_preferences":
      return {
        genderPreference: f.preferences.gender,
        languagePreference: f.preferences.language,
        notes: f.preferences.notes.trim() === "" ? null : f.preferences.notes.trim(),
      };
    case "appointment_availability":
      return { days: f.availability.days, times: f.availability.times };
    case "consent":
      return {
        treatmentAndDataUse: true,
        aiAssistedFeatures: f.consent.ai === true,
        textVersion: CONSENT_TEXT_VERSIONS.treatment_and_data_use,
      };
    case "review":
      return { confirmed: true };
  }
}

export interface FieldError {
  /** The DOM id of the control to move to (the first one of a group). */
  field: string;
  message: string;
}

/**
 * Field-level validation in plain words: what is wrong and what to do. Messages are shown beside the
 * field, linked to it, and repeated in a summary that is announced (AC-A6).
 */
export function validateStep(step: IntakeStep, f: OnboardingForm): FieldError[] {
  const errors: FieldError[] = [];
  switch (step) {
    case "personal_information": {
      const phone = f.personal.phone.trim();
      if (phone !== "" && !/^[0-9+()\-.\s]{3,40}$/.test(phone))
        errors.push({
          field: "ob-phone",
          message:
            "Use digits, spaces, brackets, plus or hyphens only, for example (555) 555-0100.",
        });
      if (!f.personal.givenName.trim() || !f.personal.familyName.trim() || !f.personal.birthDate)
        errors.push({
          field: "lang-en",
          message:
            "Your name and date of birth are missing. Go back to the account step to add them.",
        });
      break;
    }
    case "primary_goal":
      if (!f.goal.trim())
        errors.push({
          field: "ob-goal",
          message: "Write a few words about what you would like to be able to do.",
        });
      else if (f.goal.trim().length > 500)
        errors.push({
          field: "ob-goal",
          message: "Keep this under 500 characters. Shorten it and try again.",
        });
      break;
    case "body_area":
      if (!f.bodyArea)
        errors.push({ field: "area-first", message: "Choose the area you want help with." });
      if (!f.side)
        errors.push({ field: "side-left", message: "Choose a side, or not applicable." });
      break;
    case "pain_levels":
      if (f.pain.current === null)
        errors.push({
          field: "pain-current",
          message: "Choose a number from 0 to 10 for right now.",
        });
      if (f.pain.worst === null)
        errors.push({
          field: "pain-worst",
          message: "Choose a number from 0 to 10 for the worst in the last week.",
        });
      if (f.pain.best === null)
        errors.push({
          field: "pain-best",
          message: "Choose a number from 0 to 10 for the best in the last week.",
        });
      if (f.pain.best !== null && f.pain.worst !== null && f.pain.best > f.pain.worst)
        errors.push({
          field: "pain-best",
          message: "The best number cannot be higher than the worst. Check both numbers.",
        });
      break;
    case "activity_limitations":
      if (f.limitationsOther.trim().length > 500)
        errors.push({ field: "ob-other", message: "Keep this under 500 characters." });
      break;
    case "clinician_preferences":
      if (f.preferences.notes.trim().length > 500)
        errors.push({ field: "ob-notes", message: "Keep this under 500 characters." });
      break;
    case "appointment_availability":
      if (f.availability.days.length === 0)
        errors.push({
          field: "day-1",
          message: "Choose at least one day that could work for visits.",
        });
      if (f.availability.times.length === 0)
        errors.push({ field: "time-morning", message: "Choose at least one time of day." });
      break;
    case "consent":
      if (!f.consent.agree)
        errors.push({
          field: "consent-agree",
          message:
            "Tick the box to agree before you continue. If you do not agree, you can stop here and contact the clinic.",
        });
      if (f.consent.ai === null)
        errors.push({
          field: "consent-ai-yes",
          message: "Choose Yes or No for automated drafting tools.",
        });
      break;
    case "review":
      if (!f.confirmed)
        errors.push({
          field: "confirm-answers",
          message: "Tick the box to confirm your answers are right, or go back and change them.",
        });
      break;
  }
  return errors;
}

export const stepTitles: Record<IntakeStep, { title: string; intro: string }> = {
  personal_information: {
    title: "About you",
    intro: "A few details so the clinic can reach you and talk in your language.",
  },
  primary_goal: {
    title: "Your goal",
    intro: "Tell us what you want to be able to do. Your therapist uses this to shape your plan.",
  },
  body_area: {
    title: "Where it bothers you",
    intro:
      "Choose the area you want help with. You can tell your therapist about other areas later.",
  },
  pain_levels: {
    title: "Pain right now and this week",
    intro:
      "Rate your own pain from 0 to 10. There are no wrong answers, and your therapist will see them.",
  },
  activity_limitations: {
    title: "What is hard right now",
    intro:
      "Choose any everyday activities that are harder than you would like, or choose None of these.",
  },
  clinician_preferences: {
    title: "Your therapist",
    intro:
      "Tell us if you would like a therapist of a certain gender or language. We will try to match it, but we cannot promise.",
  },
  appointment_availability: {
    title: "When you can come in",
    intro:
      "Choose the days and times that usually work. We use this when you book, so you do not have to enter it again.",
  },
  consent: {
    title: "Sharing and consent",
    intro:
      "Read what the clinic will do with your information. One choice is required and one is optional.",
  },
  review: {
    title: "Review and send",
    intro: "Check your answers. You can change any of them before you send.",
  },
};

export const sideLabels: Record<string, string> = {
  left: "Left side",
  right: "Right side",
  both: "Both sides",
  not_applicable: "Not applicable",
};

export const limitationLabels: Record<(typeof activityLimitations)[number], string> = {
  walking: "Walking",
  stairs: "Using stairs",
  sitting: "Sitting for a while",
  standing: "Standing for a while",
  lifting: "Lifting or carrying",
  reaching_overhead: "Reaching overhead",
  sleeping: "Sleeping",
  driving: "Driving",
  exercise_or_sport: "Exercise or sport",
  work_tasks: "Tasks at work",
};

export const timeLabels: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

export const bodyAreaOptions = bodyAreas.map((a) => ({ value: a, label: sentenceCase(a) }));

export const dayOptions = ([1, 2, 3, 4, 5, 6, 0] as const).map((d) => ({
  value: d,
  label: weekdayNames[d]!,
}));

/** Today as the browser's calendar date, for the "in the past" check on the birth date. */
export function localToday(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Steps 1 and 2, held in memory until the account is created (DR-002 A: never in browser storage). */
export function validateCode(
  code: string,
  dob: DateParts,
): { errors: FieldError[]; birthDate: string | null; dobMessage: string | null } {
  const errors: FieldError[] = [];
  if (code.trim().length < 4)
    errors.push({ field: "ob-code", message: "Enter the eligibility code from your clinic." });
  const check = checkDateOfBirth(dob, localToday());
  if (check.error) errors.push({ field: "ob-dob-day", message: check.error });
  return { errors, birthDate: check.value, dobMessage: check.error };
}

export function validateAccount(a: {
  givenName: string;
  familyName: string;
  email: string;
  password: string;
}): FieldError[] {
  const errors: FieldError[] = [];
  if (!a.givenName.trim()) errors.push({ field: "ob-given", message: "Enter your first name." });
  if (!a.familyName.trim()) errors.push({ field: "ob-family", message: "Enter your last name." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a.email.trim()))
    errors.push({
      field: "ob-email",
      message: "Enter your email address, for example name@example.com.",
    });
  if (a.password.length < 12)
    errors.push({
      field: "ob-password",
      message: `Use at least 12 characters. Yours has ${a.password.length}. A few words in a row works well.`,
    });
  return errors;
}

/** The three parts named above the step (A1). */
export const stepParts = {
  account: "Your account",
  about: "About you",
  care: "Your care",
} as const;

/** Which part a step number (1 to 11) belongs to. */
export const partOf = (n: number): (typeof stepParts)[keyof typeof stepParts] =>
  n <= 2 ? stepParts.account : n <= 7 ? stepParts.about : stepParts.care;

/** Where each step sits in the 11 the patient is told about (two account steps come first). */
export const stepNumber = (step: IntakeStep): number => intakeSteps.indexOf(step) + 3;
