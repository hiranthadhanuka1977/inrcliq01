import { VIDEO_MAX_DURATION_SECONDS } from "@/lib/uploads/video-limits";
import type { FeedMediaTrim } from "@/types/feed/feed";

/** Shortest clip a trim can leave. */
export const MIN_TRIM_SECONDS = 1;

function round(value: number) {
  return Math.round(value * 100) / 100;
}

/** Returns a trim that is safe to play, or `undefined` for missing or invalid input. */
export function normalizeMediaTrim(value: unknown): FeedMediaTrim | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as Record<string, unknown>;
  if (typeof row.start !== "number" || typeof row.end !== "number") return undefined;
  if (!Number.isFinite(row.start) || !Number.isFinite(row.end)) return undefined;

  const start = round(Math.max(0, row.start));
  const end = round(Math.min(VIDEO_MAX_DURATION_SECONDS, row.end));
  if (end - start < MIN_TRIM_SECONDS) return undefined;
  return { start, end };
}

/** Video URL with a media fragment, so the browser loads (and first paints) the trimmed range. */
export function trimmedVideoSrc(url: string, trim: FeedMediaTrim | null | undefined) {
  return trim ? `${url}#t=${trim.start},${trim.end}` : url;
}

/** `m:ss` for durations and positions. */
export function formatClock(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}
