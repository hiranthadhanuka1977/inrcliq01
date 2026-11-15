import path from "node:path";
import { config } from "dotenv";
import type { NextConfig } from "next";

const repoRoot = path.join(process.cwd(), "..");
config({ path: path.join(repoRoot, ".env") });
config({ path: path.join(repoRoot, ".env.local"), override: true });

const mainOrigin = (process.env.MAIN_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002").replace(
  /\/$/,
  "",
);

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // One Next install (the repo's) compiles this app together with the shared seller screens.
  turbopack: {
    root: repoRoot,
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${mainOrigin}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
