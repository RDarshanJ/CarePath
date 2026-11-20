/**
 * @carepath/db public surface without a database connection: model types, enums, status
 * transition rules and error classification. Safe to import anywhere, including the web app.
 * The client itself lives in "@carepath/db/client".
 */
export * from "./generated/prisma/browser.js";
export * from "./status.js";
export * from "./errors.js";
