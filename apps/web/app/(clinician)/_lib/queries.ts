import {
  carePlanDraftResultSchema,
  carePlanDraftSchema,
  carePlanVersionDetailSchema,
  carePlanVersionListSchema,
  checkInPageSchema,
  checkInSchema,
  clinicianOverviewSchema,
  exerciseLibraryPageSchema,
  exerciseSessionPageSchema,
  intakeStateSchema,
  patientCarePlanSchema,
  patientDirectoryPageSchema,
  patientHeaderSchema,
  practitionerListSchema,
  progressViewSchema,
  recordHistoryPageSchema,
  reviewRuleListSchema,
  reviewTaskPageSchema,
  reviewTaskSchema,
  careTeamCardSchema,
  appointmentListSchema,
  appointmentPageSchema,
  conversationPageSchema,
  messagePageSchema,
  messageSchema,
  timelinePageSchema,
  type CarePlanDraftSave,
  type CarePlanPublishRequest,
} from "@carepath/shared/contracts";
import { api } from "../../../lib/api/client";

/**
 * Every clinician read and write in one place. Paths follow docs/architecture/api-phase3.md; every
 * response is parsed with the shared Zod contract, so a drifting API fails loudly.
 */
export const keys = {
  overview: ["clinician", "overview"] as const,
  // The search term is part of the key (memory only); it is never in a URL (DR-002 R2).
  directory: (params: string, q = "") => ["clinician", "directory", params, q] as const,
  practitioners: ["clinician", "practitioners"] as const,
  header: (id: string) => ["clinician", "patient", id, "header"] as const,
  careTeam: (id: string) => ["clinician", "patient", id, "care-team"] as const,
  intake: (id: string) => ["clinician", "patient", id, "intake"] as const,
  plan: (id: string) => ["clinician", "patient", id, "plan"] as const,
  versions: (id: string) => ["clinician", "patient", id, "versions"] as const,
  version: (id: string, versionId: string) =>
    ["clinician", "patient", id, "version", versionId] as const,
  draft: (id: string) => ["clinician", "patient", id, "draft"] as const,
  preview: (id: string) => ["clinician", "patient", id, "preview"] as const,
  progress: (id: string) => ["clinician", "patient", id, "progress"] as const,
  sessions: (id: string) => ["clinician", "patient", id, "sessions"] as const,
  checkIns: (id: string) => ["clinician", "patient", id, "check-ins"] as const,
  timeline: (id: string) => ["clinician", "patient", id, "timeline"] as const,
  history: (id: string) => ["clinician", "patient", id, "history"] as const,
  patientTasks: (id: string) => ["clinician", "patient", id, "tasks"] as const,
  exercises: (params: string) => ["clinician", "exercises", params] as const,
  tasks: (params: string) => ["clinician", "tasks", params] as const,
  rules: ["clinician", "rules"] as const,
  agenda: (date: string, practitionerId: string) =>
    ["clinician", "agenda", practitionerId, date] as const,
  appointments: (id: string, when: string) =>
    ["clinician", "patient", id, "appointments", when] as const,
  conversations: ["clinician", "conversations"] as const,
  thread: (conversationId: string) => ["clinician", "thread", conversationId] as const,
};

/** Build `?a=1&b=2` from defined values only. */
export function qs(params: Record<string, string | number | undefined | null>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

const pid = (id: string) => `/patients/${id}`;

export const reads = {
  overview: () => api.get("/overview", clinicianOverviewSchema),
  /** A search term goes in the body of POST /patients/search, never in the URL (CR-12, R2). */
  directory: (query: string, q = "") =>
    q
      ? api.post(`/patients/search${query}`, patientDirectoryPageSchema, { q })
      : api.get(`/patients${query}`, patientDirectoryPageSchema),
  practitioners: () => api.get("/practitioners", practitionerListSchema),
  header: (id: string) => api.get(pid(id), patientHeaderSchema),
  careTeam: (id: string) => api.get(`${pid(id)}/care-team`, careTeamCardSchema),
  intake: (id: string) => api.get(`${pid(id)}/intake`, intakeStateSchema),
  plan: (id: string) => api.get(`${pid(id)}/care-plan`, patientCarePlanSchema),
  versions: (id: string) => api.get(`${pid(id)}/care-plan/versions`, carePlanVersionListSchema),
  version: (id: string, versionId: string) =>
    api.get(`${pid(id)}/care-plan/versions/${versionId}`, carePlanVersionDetailSchema),
  /** The draft, or null when the plan has none. */
  draft: (id: string) =>
    api.get(`${pid(id)}/care-plan/draft`, carePlanDraftResultSchema).then((r) => r.draft),
  preview: (id: string) => api.get(`${pid(id)}/care-plan/draft/preview`, patientCarePlanSchema),
  progress: (id: string, weeks = 8) =>
    api.get(`${pid(id)}/progress${qs({ weeks })}`, progressViewSchema),
  sessions: (id: string, cursor?: string) =>
    api.get(`${pid(id)}/sessions${qs({ limit: 25, cursor })}`, exerciseSessionPageSchema),
  checkIns: (id: string, cursor?: string) =>
    api.get(`${pid(id)}/check-ins${qs({ limit: 25, cursor })}`, checkInPageSchema),
  timeline: (id: string, cursor?: string) =>
    api.get(`${pid(id)}/timeline${qs({ limit: 20, cursor })}`, timelinePageSchema),
  history: (id: string, cursor?: string) =>
    api.get(`${pid(id)}/record-history${qs({ limit: 25, cursor })}`, recordHistoryPageSchema),
  patientTasks: (id: string) =>
    api.get(`${pid(id)}/review-tasks${qs({ limit: 50 })}`, reviewTaskPageSchema),
  exercises: (query: string) => api.get(`/exercises${query}`, exerciseLibraryPageSchema),
  tasks: (query: string) => api.get(`/review-tasks${query}`, reviewTaskPageSchema),
  rules: () => api.get("/review-rules", reviewRuleListSchema),
  /** One practitioner's clinic-zone day, cancelled visits included (CR-1). */
  agenda: (date: string, practitionerId: string) =>
    api.get(`/appointments${qs({ date, practitionerId })}`, appointmentListSchema),
  appointments: (id: string, when: "upcoming" | "past", cursor?: string) =>
    api.get(`${pid(id)}/appointments${qs({ when, limit: 25, cursor })}`, appointmentPageSchema),
  conversations: () => api.get(`/conversations${qs({ limit: 50 })}`, conversationPageSchema),
  thread: (conversationId: string, cursor?: string) =>
    api.get(
      `/conversations/${conversationId}/messages${qs({ limit: 30, cursor })}`,
      messagePageSchema,
    ),
};

export const writes = {
  sendMessage: (conversationId: string, body: string) =>
    api.post(`/conversations/${conversationId}/messages`, messageSchema, { body }),
  markRead: (conversationId: string) => api.post(`/conversations/${conversationId}/read`, null, {}),
  retryMessage: (conversationId: string, messageId: string) =>
    api.post(`/conversations/${conversationId}/messages/${messageId}/retry`, messageSchema, {}),
  saveDraft: (id: string, body: CarePlanDraftSave) =>
    api.put(`${pid(id)}/care-plan/draft`, carePlanDraftSchema, body),
  publish: (id: string, body: CarePlanPublishRequest) =>
    api.post(`${pid(id)}/care-plan/publish`, carePlanVersionDetailSchema, body),
  reviewCheckIn: (id: string, checkInId: string) =>
    api.post(`${pid(id)}/check-ins/${checkInId}/review`, checkInSchema, {}),
  assignTask: (id: string, taskId: string, practitionerId: string | null) =>
    api.post(`${pid(id)}/review-tasks/${taskId}/assign`, reviewTaskSchema, { practitionerId }),
  resolveTask: (id: string, taskId: string, note: string) =>
    api.post(`${pid(id)}/review-tasks/${taskId}/resolve`, reviewTaskSchema, { note }),
  dismissTask: (id: string, taskId: string, note: string) =>
    api.post(`${pid(id)}/review-tasks/${taskId}/dismiss`, reviewTaskSchema, { note }),
};
