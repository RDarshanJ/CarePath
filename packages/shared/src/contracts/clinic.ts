import { z } from "zod";

/** The patient's clinic: contact details for the pain notice and messaging (AC-D7, REQ-MSG-02). */
export const clinicCardSchema = z
  .object({
    organizationId: z.uuid(),
    name: z.string(),
    timezone: z.string(),
    /** Null when the clinic has not set one; the copy then says "contact your clinic". */
    phone: z.string().nullable(),
    replyTimeText: z.string().nullable(),
    /** EMERGENCY_NOTICE, fixed text. */
    emergencyNotice: z.string(),
  })
  .meta({ id: "ClinicCard" });
export type ClinicCard = z.infer<typeof clinicCardSchema>;
