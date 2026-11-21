// Serves the static Storybook build (packages/ui/.storybook-static) for the Storybook spec. No dependency:
// node's http module and a small content-type table. Started by Playwright's webServer, stopped with it.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(
  fileURLToPath(new URL("../../../packages/ui/.storybook-static", import.meta.url)),
);
const port = Number(process.env.STORYBOOK_PORT ?? 6104);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

if (!existsSync(join(root, "index.json"))) {
  console.error(
    `No Storybook build at ${root}. Run pnpm --filter @carepath/ui storybook:build first.`,
  );
  process.exit(1);
}

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = join(root, rel);
  if (!file.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) {
    res.writeHead(404).end("Not found");
    return;
  }
  res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
}).listen(port, "127.0.0.1", () =>
  console.log(`Storybook static build on http://127.0.0.1:${port}`),
);
