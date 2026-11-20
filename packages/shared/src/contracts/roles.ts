import { z } from "zod";
import { permissionSchema, roleKeySchema } from "./auth.js";

export const roleMatrixSchema = z
  .object({
    roles: z.array(
      z.object({
        key: roleKeySchema,
        name: z.string(),
        description: z.string(),
        permissions: z.array(permissionSchema),
      }),
    ),
    permissions: z.array(z.object({ key: permissionSchema, description: z.string() })),
  })
  .meta({ id: "RoleMatrix" });

export type RoleMatrix = z.infer<typeof roleMatrixSchema>;
