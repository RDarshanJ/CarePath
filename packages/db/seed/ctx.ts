/** Shared state and small helpers for the builders. */
import type { RoleKey } from "../src/index.js";
import type { SeedProfile } from "./profiles.js";
import { Rng, stableUuid } from "./rng.js";
import type { Regimen } from "./data/text.js";
import type { PostStep, Tables } from "./types.js";

export const H = 3_600_000;
export const D = 86_400_000;
export const MIN = 60_000;

export const iso = (ms: number): string => new Date(ms).toISOString();
export const isoDate = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
export const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
export const emailFor = (local: string): string => `${local}@carepath.test`;

export interface TherapistInfo {
  userId: string;
  practitionerId: string;
  displayName: string;
  org: OrgInfo;
  index: number;
}

export interface OrgInfo {
  index: number;
  id: string;
  slug: string;
  name: string;
  timezone: string;
  offsetHours: number;
  coordinatorUserId: string;
  adminUserId: string;
  therapists: TherapistInfo[];
  ruleIds: Record<string, string>;
  exerciseIds: Map<string, string>;
}

export interface AssignmentItem {
  id: string;
  position: number;
  slug: string;
  name: string;
  sets: number | null;
  reps: number | null;
  holdSeconds: number | null;
  durationSeconds: number | null;
  restSeconds: number;
}

export interface VersionInfo {
  id: string;
  number: number;
  publishedAtMs: number;
  days: number[];
  items: AssignmentItem[];
}

export interface SessionInfo {
  id: string;
  startedAtMs: number;
  completedAtMs: number | null;
  status: "completed" | "abandoned" | "paused" | "stopped_discomfort";
  version: VersionInfo;
}

export interface CheckInInfo {
  id: string;
  submittedAtMs: number;
  painScore: number;
  row: Tables["PatientCheckIn"][number];
}

export interface PatientInfo {
  index: number;
  id: string;
  org: OrgInfo;
  userId: string | null;
  persona: string | null;
  status: "intake_incomplete" | "awaiting_assignment" | "active" | "inactive" | "discharged";
  givenName: string;
  familyName: string;
  createdAtMs: number;
  /** Last day the patient was active (ms). Anchor for active patients. */
  activeEndMs: number;
  therapist: TherapistInfo | null;
  aiConsent: boolean;
  regimen: Regimen;
  adherence: number;
  flare: boolean;
  planId: string | null;
  versions: VersionInfo[];
  sessions: SessionInfo[];
  checkIns: CheckInInfo[];
  planStartMs: number;
  conditionId: string | null;
  row: Tables["Patient"][number];
}

export interface ApptInfo {
  id: string;
  patient: PatientInfo;
  therapist: TherapistInfo;
  type: "initial_evaluation" | "follow_up" | "video_follow_up";
  status: Tables["Appointment"][number]["status"];
  startMs: number;
  endMs: number;
  row: Tables["Appointment"][number];
}

export interface Ctx {
  profile: SeedProfile;
  seed: string;
  anchorMs: number;
  rng: Rng;
  passwordHash: string;
  roleKeyById: Map<string, RoleKey>;
  t: Tables;
  post: PostStep[];
  orgs: OrgInfo[];
  patients: PatientInfo[];
  appointments: ApptInfo[];
  id(kind: string, key: string): string;
  /** Local-day helpers for an organization (fixed UTC offset). */
  localMidnight(org: OrgInfo, dayOffset: number): number;
  weekday(org: OrgInfo, dayOffset: number): number;
  dayOffsetOf(org: OrgInfo, ms: number): number;
}

export function emptyTables(): Tables {
  return {
    Organization: [],
    User: [],
    OrganizationMembership: [],
    Patient: [],
    Practitioner: [],
    CareTeam: [],
    CareTeamMember: [],
    Consent: [],
    IntakeAssessment: [],
    EnrollmentCode: [],
    Condition: [],
    Exercise: [],
    CarePlan: [],
    CarePlanVersion: [],
    ExerciseAssignment: [],
    Goal: [],
    ExerciseSession: [],
    SessionActivity: [],
    PatientCheckIn: [],
    AvailabilitySlot: [],
    Appointment: [],
    Encounter: [],
    Observation: [],
    AIGeneration: [],
    ClinicalNote: [],
    ClinicalNoteVersion: [],
    AIReview: [],
    Conversation: [],
    ConversationParticipant: [],
    Message: [],
    Notification: [],
    ReviewRule: [],
    ReviewTask: [],
    AuditEvent: [],
    Job: [],
  };
}

export function makeCtx(
  profile: SeedProfile,
  seed: string,
  anchorMs: number,
  passwordHash: string,
): Ctx {
  const ctx: Ctx = {
    profile,
    seed,
    anchorMs,
    rng: new Rng(seed),
    passwordHash,
    roleKeyById: new Map(),
    t: emptyTables(),
    post: [],
    orgs: [],
    patients: [],
    appointments: [],
    id: (kind, key) => stableUuid(seed, `${kind}/${key}`),
    localMidnight(org, dayOffset) {
      const localDay = Math.floor((anchorMs + org.offsetHours * H) / D);
      return (localDay + dayOffset) * D - org.offsetHours * H;
    },
    weekday(org, dayOffset) {
      const localDay = Math.floor((anchorMs + org.offsetHours * H) / D) + dayOffset;
      return (((localDay + 4) % 7) + 7) % 7; // epoch day 0 was a Thursday; 0 = Sunday
    },
    dayOffsetOf(org, ms) {
      const anchorDay = Math.floor((anchorMs + org.offsetHours * H) / D);
      return Math.floor((ms + org.offsetHours * H) / D) - anchorDay;
    },
  };
  return ctx;
}
