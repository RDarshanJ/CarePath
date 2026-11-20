import swagger from "@fastify/swagger";
import type { FastifyInstance } from "fastify";
import { jsonSchemaTransform, jsonSchemaTransformObject } from "fastify-type-provider-zod";

/**
 * OpenAPI generated from the same Zod schemas that validate requests and responses (ADR-2).
 * Served at GET /docs/openapi.json; `pnpm openapi:check` validates it and diffs it against the
 * committed apps/api/openapi.json.
 */
export async function registerOpenApi(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "CarePath API",
        version: "0.1.0",
        description:
          "Demonstration product. Synthetic data. Not for clinical use. Session cookie auth; " +
          "mutating requests need an allowed Origin and the x-csrf-token header.",
      },
      tags: [
        { name: "auth", description: "Sessions." },
        { name: "patients", description: "Patient header and directory." },
        { name: "today", description: "Patient Today." },
        { name: "care-plan", description: "Care plans, versions, draft, preview and publish." },
        { name: "exercises", description: "Exercise library." },
        { name: "sessions", description: "Guided exercise sessions." },
        { name: "check-ins", description: "Check-ins and pain reports." },
        { name: "progress", description: "Weekly progress." },
        { name: "clinic", description: "Clinic contact card." },
        { name: "clinician", description: "Overview, timeline and record history." },
        { name: "review", description: "Review rules and tasks." },
        { name: "onboarding", description: "Account creation, intake and consents." },
        { name: "care-team", description: "Care teams and clinician assignment." },
        { name: "admin", description: "Administration." },
        { name: "system", description: "Health and documentation." },
      ],
      components: {
        securitySchemes: {
          sessionCookie: { type: "apiKey", in: "cookie", name: "cp_session" },
        },
      },
      security: [{ sessionCookie: [] }],
    },
    transform: jsonSchemaTransform,
    transformObject: jsonSchemaTransformObject,
  });
}

export function registerOpenApiRoute(app: FastifyInstance): void {
  app.get(
    "/docs/openapi.json",
    { config: { access: { auth: "public" } }, schema: { hide: true } },
    async () => app.swagger(),
  );
}
