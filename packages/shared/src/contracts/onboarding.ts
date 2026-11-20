import { z } from "zod";

/**
 * Account creation with an eligibility code, in one request (C1 section 5.4). Code check, code
 * redemption, user, membership, patient and intake are one transaction: an unknown, used or
 * expired code answers 400 `eligibility_code_invalid` and creates nothing (AC-A3). Codes are
 * pasteable; spaces and letter case are ignored (WCAG 3.3.8). Response: 201 SessionInfo with the
 * session cookie set, like a login.
 */
export const createAccountRequestSchema = z
  .object({
    email: z.string().trim().toLowerCase().min(3).max(254).pipe(z.email()),
    /** No composition rules beyond length; paste and password managers work. */
    password: z.string().min(12).max(256),
    eligibilityCode: z.string().trim().min(4).max(64),
    givenName: z.string().trim().min(1).max(100),
    familyName: z.string().trim().min(1).max(100),
    birthDate: z.iso.date(),
  })
  .strict()
  .meta({ id: "CreateAccountRequest" });
export type CreateAccountRequest = z.input<typeof createAccountRequestSchema>;
