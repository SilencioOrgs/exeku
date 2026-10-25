import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  // Temporarily disabled while diagnosing the Next.js 16.4 client-navigation crash.
  // Direct /app/workspace?problem=... reloads succeed but client transitions fail.
  // Re-enable only after an actual browser regression test confirms route stability.
  partialPrefetching: false,
  images: {
    unoptimized: true,
    remotePatterns: [],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
