import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Playwright (and local tooling) to hit the dev server via 127.0.0.1
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
