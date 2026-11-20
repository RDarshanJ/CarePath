import { z } from "zod";
import { allPermissions, roleKeys } from "../authz/permissions.js";

export const loginBodySchema = z
  .object({
    email: z.string().trim().toLowerCase().min(3).max(254),
    // Paste and password managers are allowed (WCAG 3.3.8); no composition rules on login.
    password: z.string().min(1).max(256),
    organizationSlug: z
      .string()
      .max(80)
      .optional()
      .describe("Needed only when the account belongs to more than one organization."),
  })
  .strict()
  .meta({ id: "LoginRequest" });

export const sessionInfoSchema = z
  .object({
    user: z.object({ id: z.uuid(), displayName: z.string(), email: z.string() }),
    organization: z.object({ id: z.uuid(), name: z.string(), slug: z.string() }),
    role: z.enum(roleKeys),
    permissions: z.array(z.enum(allPermissions as [string, ...string[]])),
    patientId: z.uuid().nullable(),
    practitionerId: z.uuid().nullable(),
    csrfToken: z
      .string()
      .describe("Send as the x-csrf-token header on every POST, PUT, PATCH and DELETE."),
    expiresAt: z.iso.datetime().describe("Absolute end of the session (12 hours after login)."),
    idleExpiresAt: z.iso
      .datetime()
      .describe("End of the session if no request arrives first (30 minutes idle)."),
  })
  .meta({ id: "SessionInfo" });

export type SessionInfo = z.infer<typeof sessionInfoSchema>;
