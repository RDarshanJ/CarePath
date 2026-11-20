import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@carepath/shared", "@carepath/ui"],
};

export default config;
