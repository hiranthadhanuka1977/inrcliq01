import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Turbopack scoped to this app. Sibling folders (livefeed/web/inrcliq)
  // are local workspace copies and must not be part of the compile graph.
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: ["@tensorflow/tfjs", "nsfwjs"],
  outputFileTracingIncludes: {
    "/api/feed/moderate-image": ["./public/models/mobilenet_v2/**/*"],
    "/api/feed/uploads": ["./public/models/mobilenet_v2/**/*"],
  },
};

export default nextConfig;
