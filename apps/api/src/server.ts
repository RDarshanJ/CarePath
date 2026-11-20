import { buildApp } from "./app.js";

const port = Number(process.env["API_PORT"] ?? 4000);
const host = process.env["API_HOST"] ?? "127.0.0.1";

const app = buildApp();
app.listen({ port, host }).catch((err: unknown) => {
  app.log.error(err);
  process.exit(1);
});
