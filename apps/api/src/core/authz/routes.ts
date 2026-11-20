import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { errorResponses } from "../errors.js";
import { allPermissions, isPermission, permissionDescriptions, roleKeys } from "./permissions.js";
import { listRoles } from "./repo.js";

const permissionEnum = z.enum(allPermissions as [string, ...string[]]);

const roleMatrixSchema = z
  .object({
    roles: z.array(
      z.object({
        key: z.enum(roleKeys),
        name: z.string(),
        description: z.string(),
        permissions: z.array(permissionEnum),
      }),
    ),
    permissions: z.array(z.object({ key: permissionEnum, description: z.string() })),
  })
  .meta({ id: "RoleMatrix" });

/** Read-only role matrix for the admin "Roles" screen (PRD section 5: users, roles). */
export const roleRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/roles",
    {
      config: { access: { permission: "roles.read" } },
      schema: {
        operationId: "listRoles",
        tags: ["admin"],
        summary: "Roles and their permission keys, as stored in the database.",
        response: { 200: roleMatrixSchema, ...errorResponses(401, 403, 429) },
      },
    },
    async () => {
      const rows = await listRoles(app.deps.db);
      return {
        roles: rows.map((r) => ({ ...r, permissions: r.permissions.filter(isPermission) })),
        permissions: allPermissions.map((key) => ({
          key,
          description: permissionDescriptions[key],
        })),
      };
    },
  );
};
