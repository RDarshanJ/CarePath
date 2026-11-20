import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { roleMatrixSchema } from "@carepath/shared/contracts";
import { errorResponses } from "../errors.js";
import { allPermissions, isPermission, permissionDescriptions } from "./permissions.js";
import { listRoles } from "./repo.js";

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
