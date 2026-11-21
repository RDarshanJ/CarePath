import {
  careTeamCardSchema,
  patientDirectoryPageSchema,
  practitionerListSchema,
} from "@carepath/shared/contracts";
import { api } from "../../../lib/api/client";

/** The coordinator and administrator reads and the one write (assignment). Real API, parsed with the shared contracts. */
export const keys = {
  // The search term is part of the key (memory only); it is never in a URL (DR-002 R2).
  directory: (query: string, q = "") => ["admin", "directory", query, q] as const,
  practitioners: ["admin", "practitioners"] as const,
};

export function qs(params: Record<string, string | number | undefined | null>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const reads = {
  /** A search term goes in the body of POST /patients/search, never in the URL (CR-12, R2). */
  directory: (query: string, q = "") =>
    q
      ? api.post(`/patients/search${query}`, patientDirectoryPageSchema, { q })
      : api.get(`/patients${query}`, patientDirectoryPageSchema),
  practitioners: () => api.get("/practitioners", practitionerListSchema),
};

export const writes = {
  assign: (patientId: string, practitionerId: string) =>
    api.post(`/patients/${patientId}/care-team/assignments`, careTeamCardSchema, {
      practitionerId,
    }),
};
