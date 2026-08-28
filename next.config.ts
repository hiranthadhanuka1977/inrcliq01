import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Turbopack scoped to this app. Sibling folders (livefeed/web/inrcliq)
  // are local workspace copies and must not be part of the compile graph.
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: ["@tensorflow/tfjs", "nsfwjs", "sharp"],
};

export default nextConfig;
