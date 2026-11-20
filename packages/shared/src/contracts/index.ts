/**
 * Zod contracts shared by apps/api and apps/web (ADR-13, checkpoint C1 ruling 3.5). One file per
 * domain. The API validates requests and responses with these schemas and generates
 * apps/api/openapi.json from them. Owner: the API worker. UI workers never edit these files;
 * they append requests to docs/decisions/contract-requests.md.
 * Route by route mapping: docs/architecture/api-phase3.md.
 */
export * from "./auth.js";
export * from "./errors.js";
export * from "./health.js";
export * from "./patients.js";
export * from "./permissions.js";
export * from "./roles.js";
