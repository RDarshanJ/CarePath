import type { NextConfig } from "next";

/**
 * One origin (checkpoint C1, section 5.2). The browser only talks to the web origin; Next rewrites
 * `/api/*` to the API, so the session cookie is first-party. The destination is fixed at build time
 * from API_ORIGIN, or from API_PORT (default 4000) on loopback. Gates build with the gate's API_PORT.
 * Server components read the same variables at run time (see lib/api/origin.ts).
 */
const apiOrigin =
  process.env["API_ORIGIN"] ?? `http://127.0.0.1:${process.env["API_PORT"] ?? 4000}`;

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@carepath/shared", "@carepath/ui"],
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiOrigin}/:path*` }];
  },
  // @carepath/shared is written for Node ESM (`./auth.js` names `auth.ts`). Turbopack does not map
  // .js to .ts, so the web build uses webpack (`next build --webpack`) with this alias.
  webpack(webpackConfig: { resolve: { extensionAlias?: Record<string, string[]> } }) {
    webpackConfig.resolve.extensionAlias = {
      ...webpackConfig.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    };
    return webpackConfig;
  },
};

export default config;
