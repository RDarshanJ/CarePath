import type {
  Appointment,
  CarePlanDiff,
  CarePlanVersionList,
  ConsentList,
  Message,
  PatientHeader,
  WeeklyProgress,
} from "@carepath/shared/contracts";

/*
 * Synthetic specimen content for the healthcare gallery. Names, numbers and records are invented for
 * the demonstration; the seed anchor day is Thursday Nov 19, 2026 in the clinic zone (America/Denver).
 */

export const TZ = "America/Denver";
export const TODAY = "2026-11-19";
export const NOW = "2026-11-19T16:00:00.000Z";

export const longPatient: PatientHeader = {
  id: "7c1e2b0a-4d3f-4a51-9b6e-0f2d8c4a1e01",
  mrn: "CP-204718",
  givenName: "Maria Fernanda",
  familyName: "Okonkwo-Lindqvist de la Vega",
  birthDate: "1959-11-20",
  gender: "female",
  status: "active",
  timezone: "America/Denver",
  preferredLanguage: "es",
  onCareTeam: true,
};

export const sparsePatient: PatientHeader = {
  id: "7c1e2b0a-4d3f-4a51-9b6e-0f2d8c4a1e02",
  mrn: "CP-311090",
  givenName: "Jun",
  familyName: "Park",
  birthDate: "1990-02-14",
  gender: "unknown",
  status: "awaiting_assignment",
  timezone: "",
  preferredLanguage: "",
  onCareTeam: false,
};

export const careTeam = [
  {
    userId: "a1",
    practitionerId: "p1",
    name: "Dana Whitfield",
    credentials: "PT, DPT",
    role: "primary_therapist" as const,
    roleLabel: "Primary physical therapist",
    since: "2026-09-02T16:00:00Z",
  },
  {
    userId: "a2",
    practitionerId: null,
    name: "Luis Carrasco",
    credentials: null,
    role: "care_coordinator" as const,
    roleLabel: "Care coordinator",
    since: "2026-09-02T16:00:00Z",
  },
];

export const rowPatients = [
  {
    id: "r1",
    givenName: "Maria Fernanda",
    familyName: "Okonkwo-Lindqvist de la Vega",
    birthDate: "1959-11-20",
    task: "Pain 8 of 10 reported",
  },
  {
    id: "r2",
    givenName: "Maria",
    familyName: "Okonkwo",
    birthDate: "1984-03-04",
    task: "Session stopped for discomfort",
  },
  {
    id: "r3",
    givenName: "Sam",
    familyName: "Lee",
    birthDate: "2001-07-30",
    task: "Check-in not yet reviewed",
  },
];

export const painPoints = [
  { checkInId: "c1", date: "2026-10-23", painScore: 6 },
  { checkInId: "c2", date: "2026-10-27", painScore: 6 },
  { checkInId: "c3", date: "2026-10-31", painScore: 5 },
  { checkInId: "c4", date: "2026-11-04", painScore: 7 },
  { checkInId: "c5", date: "2026-11-15", painScore: 4 },
  { checkInId: "c6", date: "2026-11-17", painScore: 5 },
  { checkInId: "c7", date: "2026-11-19", painScore: 3 },
];
export const painRange = { from: "2026-10-23", to: "2026-11-19" };
export const planUpdates = [{ date: "2026-11-06", versionNumber: 3 }];

export const weeks: WeeklyProgress[] = [
  {
    weekStart: "2026-10-26",
    weekEnd: "2026-11-01",
    assignedSessions: 5,
    completedSessions: 5,
    stoppedSessions: 0,
    completedActivities: 20,
    skippedActivities: 0,
  },
  {
    weekStart: "2026-11-02",
    weekEnd: "2026-11-08",
    assignedSessions: 5,
    completedSessions: 3,
    stoppedSessions: 1,
    completedActivities: 13,
    skippedActivities: 2,
  },
  {
    weekStart: "2026-11-09",
    weekEnd: "2026-11-15",
    assignedSessions: 5,
    completedSessions: 4,
    stoppedSessions: 0,
    completedActivities: 16,
    skippedActivities: 1,
  },
  {
    weekStart: "2026-11-16",
    weekEnd: "2026-11-22",
    assignedSessions: 4,
    completedSessions: 2,
    stoppedSessions: 1,
    completedActivities: 9,
    skippedActivities: 0,
  },
];

export const daySessions = [
  { date: "2026-11-16", status: "completed" as const },
  { date: "2026-11-17", status: "stopped_discomfort" as const },
  { date: "2026-11-19", status: "completed" as const },
];

export const exercises = {
  bridge: {
    name: "Bridge",
    bodyArea: "Lower back",
    category: "Strength",
    instructions:
      "Lie on your back with knees bent and feet flat. Press through your heels to lift your hips, hold, then lower slowly.",
    mediaPath: null,
    mediaAlt: null,
  },
  squat: {
    name: "Mini squat",
    bodyArea: "Knee",
    category: "Strength",
    instructions:
      "Stand with feet hip-width apart, hold a counter for balance, bend your knees a little, then stand up straight.",
    mediaPath: "/assets/illustrations/ex-mini-squat-480.webp",
    mediaAlt: "A person standing at a counter with knees slightly bent.",
  },
  long: {
    name: "Side-lying hip abduction with resistance band above the knees, slow return",
    bodyArea: "Hip",
    category: "Strength",
    instructions:
      "Lie on your side with the band above your knees. Lift the top leg a short way, then lower it over three counts.",
    mediaPath: null,
    mediaAlt: null,
  },
  heel: {
    name: "Heel slide",
    bodyArea: "Knee",
    category: "Mobility",
    instructions: "Lie on your back and slide one heel towards you, then slide it back out.",
    mediaPath: "/assets/illustrations/ex-heel-slide-480.webp",
    mediaAlt: "A person lying on their back with one knee bent.",
  },
};

export const doses = {
  bridge: { sets: 3, reps: 10, holdSeconds: 5, durationSeconds: null, restSeconds: 30 },
  squat: { sets: 2, reps: 12, holdSeconds: null, durationSeconds: null, restSeconds: 45 },
  long: { sets: 2, reps: 8, holdSeconds: 3, durationSeconds: null, restSeconds: 30 },
  heel: { sets: null, reps: null, holdSeconds: null, durationSeconds: 60, restSeconds: 0 },
};

export const diffV3: CarePlanDiff = {
  previousVersionNumber: 2,
  added: [{ exerciseId: "e4", name: "Heel slide" }],
  removed: [{ exerciseId: "e5", name: "Wall push-up" }],
  changed: [
    { exerciseId: "e1", name: "Bridge", fields: ["reps", "holdSeconds", "instructions"] },
    { exerciseId: "e2", name: "Mini squat", fields: ["daysOfWeek"] },
  ],
};
export const diffEmpty: CarePlanDiff = {
  previousVersionNumber: 1,
  added: [],
  removed: [],
  changed: [],
};

const dana = { userId: "a1", practitionerId: "p1", name: "Dana Whitfield, PT" };
export const versions: CarePlanVersionList["items"] = [
  {
    id: "v1",
    number: 1,
    publishedAt: "2026-09-04T17:00:00Z",
    publishedBy: dana,
    changeNoteForPatient: null,
    isCurrent: false,
  },
  {
    id: "v2",
    number: 2,
    publishedAt: "2026-10-12T17:00:00Z",
    publishedBy: dana,
    changeNoteForPatient: "Only planning changes on the days you walk.",
    isCurrent: false,
  },
  {
    id: "v3",
    number: 3,
    publishedAt: "2026-11-06T17:00:00Z",
    publishedBy: dana,
    changeNoteForPatient:
      "I added the heel slide and made the bridge hold a little longer. Stop and tell me if the bridge hurts your back more than a 4 of 10.",
    isCurrent: true,
  },
];

const base: Omit<Appointment, "id" | "status" | "startsAt" | "endsAt" | "date" | "type"> = {
  patient: { id: "p1", name: "Maria Fernanda Okonkwo-Lindqvist de la Vega" },
  practitioner: { userId: "a1", practitionerId: "p1", name: "Dana Whitfield, PT" },
  slotId: null,
  timezone: TZ,
  reason: "Knee pain on stairs since the last visit",
  bookedBy: null,
  createdAt: "2026-11-01T16:00:00Z",
  cancelledAt: null,
  cancellationReason: null,
  cancelledBy: null,
  rescheduledFromId: null,
  rescheduledToId: null,
};
export const appointments: Appointment[] = [
  {
    ...base,
    id: "ap1",
    type: "follow_up",
    status: "booked",
    startsAt: "2026-11-19T21:00:00Z",
    endsAt: "2026-11-19T21:45:00Z",
    date: "2026-11-19",
  },
  {
    ...base,
    id: "ap2",
    type: "video_follow_up",
    status: "booked",
    startsAt: "2026-11-24T16:00:00Z",
    endsAt: "2026-11-24T16:30:00Z",
    date: "2026-11-24",
  },
  {
    ...base,
    id: "ap3",
    type: "follow_up",
    status: "cancelled_by_patient",
    startsAt: "2026-11-20T17:00:00Z",
    endsAt: "2026-11-20T17:45:00Z",
    date: "2026-11-20",
    cancelledAt: "2026-11-17T15:10:00Z",
    cancelledBy: { userId: "p1u", practitionerId: null, name: "Maria Okonkwo-Lindqvist" },
    cancellationReason: "Work shift moved",
    rescheduledToId: "ap4",
  },
  {
    ...base,
    id: "ap5",
    type: "initial_evaluation",
    status: "completed",
    startsAt: "2026-09-02T16:00:00Z",
    endsAt: "2026-09-02T17:00:00Z",
    date: "2026-09-02",
    reason: null,
  },
  {
    ...base,
    id: "ap6",
    type: "follow_up",
    status: "no_show",
    startsAt: "2026-10-20T16:00:00Z",
    endsAt: "2026-10-20T16:45:00Z",
    date: "2026-10-20",
    practitioner: { userId: null, practitionerId: null, name: "" },
  },
];
export const replacementStart = "2026-11-27T17:00:00Z";

const patientSender = {
  userId: "p1u",
  name: "Maria Okonkwo-Lindqvist",
  role: "patient" as const,
  roleLabel: "Patient",
};
const ptSender = {
  userId: "a1",
  name: "Dana Whitfield",
  role: "physical_therapist" as const,
  roleLabel: "Physical therapist",
};
const m = (over: Partial<Message> & Pick<Message, "id" | "body" | "createdAt">): Message => ({
  conversationId: "cv1",
  status: "sent",
  sender: patientSender,
  mine: false,
  sentAt: over.createdAt,
  failureReason: null,
  canRetry: false,
  ...over,
});

/** The thread as the patient sees it (their own messages are `mine`). */
export const patientThread: Message[] = [
  m({
    id: "m1",
    body: "Hi Dana, the bridge is fine but my knee aches after the mini squats. Should I keep going?",
    createdAt: "2026-11-17T15:02:00Z",
    mine: true,
  }),
  m({
    id: "m2",
    body: "Thanks for telling me. Keep the squats shallow, and stop if the ache goes past 4 of 10. We can look at it on Thursday.",
    createdAt: "2026-11-17T18:40:00Z",
    sender: ptSender,
  }),
  m({
    id: "m3",
    body: "OK, I will. One more question about the heel slide:\nhow far should my heel go?",
    createdAt: "2026-11-19T15:20:00Z",
    mine: true,
    status: "failed",
    failureReason: "The message could not reach the clinic.",
    canRetry: true,
    sentAt: null,
  }),
  m({
    id: "m4",
    body: "Also my reference from the referral letter is REF-2026-11-0042-KNEE-LEFT-FOLLOWUP-PHYSIOTHERAPY-OUTPATIENT-ROUTINE.",
    createdAt: "2026-11-19T15:24:00Z",
    mine: true,
    status: "queued",
    sentAt: null,
  }),
];

/** The same thread as the therapist sees it. */
export const staffThread: Message[] = patientThread
  .map((x) =>
    x.sender.role === "patient"
      ? { ...x, mine: false, status: "sent" as const, failureReason: null, canRetry: false }
      : { ...x, mine: true },
  )
  .filter((x) => x.id !== "m3" && x.id !== "m4");

export const consentAllowed: ConsentList = {
  types: [
    {
      type: "treatment_and_data_use",
      required: true,
      grantable: true,
      currentTextVersion: "2026-11-01",
      active: {
        id: "k1",
        type: "treatment_and_data_use",
        status: "active",
        textVersion: "2026-11-01",
        policyUri: "/consent",
        grantedAt: "2026-11-02T22:14:00Z",
        revokedAt: null,
      },
    },
    {
      type: "ai_assisted_features",
      required: false,
      grantable: true,
      currentTextVersion: "2026-11-15",
      active: {
        id: "k2",
        type: "ai_assisted_features",
        status: "active",
        textVersion: "2026-11-01",
        policyUri: "/consent",
        grantedAt: "2026-11-02T22:16:00Z",
        revokedAt: null,
      },
    },
    {
      type: "motion_tracking",
      required: false,
      grantable: false,
      currentTextVersion: "2026-11-01",
      active: null,
    },
  ],
  history: [],
};
export const consentOff: ConsentList = {
  types: [
    { ...consentAllowed.types[0]!, active: null },
    { ...consentAllowed.types[1]!, active: null },
    consentAllowed.types[2]!,
  ],
  history: [
    {
      id: "k3",
      type: "ai_assisted_features",
      status: "inactive",
      textVersion: "2026-11-01",
      policyUri: "/consent",
      grantedAt: "2026-11-02T22:16:00Z",
      revokedAt: "2026-11-12T19:30:00Z",
    },
    {
      id: "k4",
      type: "treatment_and_data_use",
      status: "inactive",
      textVersion: "2026-11-01",
      policyUri: "/consent",
      grantedAt: "2026-11-02T22:14:00Z",
      revokedAt: "2026-11-13T17:00:00Z",
    },
  ],
};

export const demoProvider = { label: "Demo provider, rule-based", isDemo: true };
export const provenance = {
  provider: demoProvider,
  recordCount: 11,
  from: "2026-11-05T07:00:00Z",
  to: "2026-11-19T16:00:00Z",
  generatedAt: "2026-11-19T15:58:00Z",
  timezone: TZ,
};
