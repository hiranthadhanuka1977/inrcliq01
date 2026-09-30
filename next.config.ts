import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Turbopack scoped to this app. Sibling folders (livefeed/web/inrcliq)
  // are local workspace copies and must not be part of the compile graph.
  turbopack: {
    root: process.cwd(),
  },
  // The seed sample routes list data/*.json at runtime, which tracing cannot detect.
  outputFileTracingIncludes: {
    "/api/settings/feed-seed": ["./data/*.json"],
    "/api/settings/demo-users": ["./data/*.json"],
    "/settings/feed-mgmt/settings": ["./data/*.json"],
  },
};

export default nextConfig;
