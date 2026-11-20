/** Where server components reach the API directly (never used in the browser). */
export function apiOrigin(): string {
  return process.env["API_ORIGIN"] ?? `http://127.0.0.1:${process.env["API_PORT"] ?? 4000}`;
}
