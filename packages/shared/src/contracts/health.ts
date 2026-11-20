import { z } from "zod";

export const healthSchema = z
  .object({
    status: z.enum(["ok", "unavailable"]),
    checks: z.object({ database: z.enum(["ok", "unavailable"]) }),
  })
  .meta({ id: "Health" });

export type Health = z.infer<typeof healthSchema>;
