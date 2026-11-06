import type { NextConfig } from "next";
import path from "node:path";
import { config } from "dotenv";

const repoRoot = path.join(process.cwd(), "..");
config({ path: path.join(repoRoot, ".env") });
config({ path: path.join(repoRoot, ".env.local"), override: true });

const nextConfig: NextConfig = {
  // Keep this app's root here so the main InrCliq middleware is not compiled with it.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
