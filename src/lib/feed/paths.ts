/** Base path for the merged livefeed surface inside inrcliq. */
export const FEED_BASE = "/feed";

/** Join a feed-relative path onto the /feed prefix. */
export function feedPath(path = "/"): string {
  if (!path || path === "/") return FEED_BASE;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === FEED_BASE || normalized.startsWith(`${FEED_BASE}/`)) {
    return normalized;
  }
  return `${FEED_BASE}${normalized}`;
}
