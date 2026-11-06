import type { FeedAudio } from "@/types/feed/feed";

function asFeedAudio(value: unknown): FeedAudio | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Partial<FeedAudio>;
  if (typeof row.audio_url !== "string" || !row.audio_url) return null;
  if (typeof row.title !== "string" || !row.title) return null;
  return row as FeedAudio;
}

/** Reads one stored clip or a `{ clips }` set. Older posts store a single clip. */
export function readFeedAudios(value: unknown): FeedAudio[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(asFeedAudio).filter((clip): clip is FeedAudio => clip !== null);
  }
  if (typeof value === "object" && Array.isArray((value as { clips?: unknown }).clips)) {
    const clips = readFeedAudios((value as { clips: unknown }).clips);
    if (clips.length) return clips;
  }
  const single = asFeedAudio(value);
  return single ? [single] : [];
}
