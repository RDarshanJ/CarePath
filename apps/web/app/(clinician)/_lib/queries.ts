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
  directory: (params: string) => ["clinician", "directory", params] as const,
  practitioners: ["clinician", "practitioners"] as const,
  header: (id: string) => ["clinician", "patient", id, "header"] as const,
  careTeam: (id: string) => ["clinician", "patient", id, "care-team"] as const,
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
  directory: (query: string) => api.get(`/patients${query}`, patientDirectoryPageSchema),
  practitioners: () => api.get("/practitioners", practitionerListSchema),
  header: (id: string) => api.get(pid(id), patientHeaderSchema),
  careTeam: (id: string) => api.get(`${pid(id)}/care-team`, careTeamCardSchema),
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
};

export const writes = {
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
