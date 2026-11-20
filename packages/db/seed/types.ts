/**
 * Row shapes for the seed. They are derived from the generated Prisma model types, so a column
 * added to schema.prisma without a value in the seed fails the typecheck. On the wire every
 * timestamp is an ISO string, every date a "YYYY-MM-DD" string and every decimal a number.
 */
import type * as M from "../src/index.js";
import type { SeedProfile } from "./profiles.js";
import type { Decimal } from "@prisma/client/runtime/client";

type Wire<T> = {
  [K in keyof T]: T[K] extends Date
    ? string
    : T[K] extends Date | null
      ? string | null
      : T[K] extends Decimal
        ? number
        : T[K] extends Decimal | null
          ? number | null
          : T[K];
};

export type Row = Record<string, unknown>;

export type MembershipRow = Omit<Wire<M.OrganizationMembership>, "roleId"> & { roleKey: M.RoleKey };

/** Tables written by the seed, keyed by Prisma model name, in the order of the FK graph. */
export interface Tables {
  Organization: Wire<M.Organization>[];
  User: Wire<M.User>[];
  OrganizationMembership: MembershipRow[];
  Patient: Wire<M.Patient>[];
  Practitioner: Wire<M.Practitioner>[];
  CareTeam: Wire<M.CareTeam>[];
  CareTeamMember: Wire<M.CareTeamMember>[];
  Consent: Wire<M.Consent>[];
  IntakeAssessment: Wire<M.IntakeAssessment>[];
  EnrollmentCode: Wire<M.EnrollmentCode>[];
  Condition: Wire<M.Condition>[];
  Exercise: Wire<M.Exercise>[];
  CarePlan: Wire<M.CarePlan>[];
  CarePlanVersion: Wire<M.CarePlanVersion>[];
  ExerciseAssignment: Wire<M.ExerciseAssignment>[];
  Goal: Wire<M.Goal>[];
  ExerciseSession: Wire<M.ExerciseSession>[];
  SessionActivity: Wire<M.SessionActivity>[];
  PatientCheckIn: Wire<M.PatientCheckIn>[];
  AvailabilitySlot: Wire<M.AvailabilitySlot>[];
  Appointment: Wire<M.Appointment>[];
  Encounter: Wire<M.Encounter>[];
  Observation: Wire<M.Observation>[];
  AIGeneration: Wire<M.AIGeneration>[];
  ClinicalNote: Wire<M.ClinicalNote>[];
  ClinicalNoteVersion: Wire<M.ClinicalNoteVersion>[];
  AIReview: Wire<M.AIReview>[];
  Conversation: Wire<M.Conversation>[];
  ConversationParticipant: Wire<M.ConversationParticipant>[];
  Message: Wire<M.Message>[];
  Notification: Wire<M.Notification>[];
  ReviewRule: Wire<M.ReviewRule>[];
  ReviewTask: Wire<M.ReviewTask>[];
  AuditEvent: Wire<M.AuditEvent>[];
  Job: Wire<M.Job>[];
}

export type TableName = keyof Tables;

/**
 * Tables in insert order. Rows that must be written in two steps (a plan that points at its own
 * version, a note that is signed after its content exists) are written as drafts first and
 * moved with the `post` steps below, exactly as the application does it.
 */
export const insertOrder: readonly TableName[] = [
  "Organization",
  "User",
  "OrganizationMembership",
  "Patient",
  "Practitioner",
  "CareTeam",
  "CareTeamMember",
  "Consent",
  "IntakeAssessment",
  "EnrollmentCode",
  "Condition",
  "Exercise",
  "CarePlan",
  "CarePlanVersion",
  "ExerciseAssignment",
  "Goal",
  "ExerciseSession",
  "SessionActivity",
  "PatientCheckIn",
  "AvailabilitySlot",
  "Appointment",
  "Encounter",
  "Observation",
  "AIGeneration",
  "ClinicalNote",
  "ClinicalNoteVersion",
  "AIReview",
  "Conversation",
  "ConversationParticipant",
  "Message",
  "Notification",
  "ReviewRule",
  "ReviewTask",
  "AuditEvent",
  "Job",
];

/**
 * A step run after the main inserts, in order. An update row carries `id` plus the columns to
 * set; an insert row carries every column.
 */
export type PostStep = { kind: "update" | "insert"; table: TableName; rows: Row[] };

export interface DemoAccount {
  email: string;
  role: M.RoleKey;
  organization: string;
  displayName: string;
  purpose: string;
}

export interface Dataset {
  profile: SeedProfile;
  seed: string;
  anchor: string;
  tables: Tables;
  /** Steps that must wait for earlier rows (publishing a plan, signing a note, amendments). */
  post: PostStep[];
  demoAccounts: DemoAccount[];
  demoPassword: string;
}
