import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pin the workspace root — a stray lockfile in the home dir confuses inference
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
