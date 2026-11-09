import { normalizeMediaTrim } from "@/lib/feed/media-trim";
import { isStoredUploadUrl } from "@/lib/uploads/store-upload";
import type { FeedMedia, FeedMediaTrim } from "@/types/feed/feed";

/** One uploaded video pulled out of a feed post, including mixed photo/video posts. */
export type ExtractedPostVideo = {
  itemIndex: number;
  url: string;
  poster: string | null;
  alt: string;
  caption: string | null;
  trim: FeedMediaTrim | null;
};

const GENERIC_ALTS = new Set(["video", "video thumbnail", "post image", "image", "photo"]);

function asTrim(value: unknown) {
  return normalizeMediaTrim(value) ?? null;
}

function storedPoster(value: unknown) {
  return typeof value === "string" && isStoredUploadUrl(value) ? value : null;
}

/**
 * Videos a person attached with Create Post.
 * Each video in a mixed post is returned on its own. Photos, audio, and the shared sample clip are left out.
 */
export function videosFromPostMedia(media: unknown): ExtractedPostVideo[] {
  if (!media || typeof media !== "object") return [];
  const row = media as FeedMedia;
  const items = Array.isArray(row.items) ? row.items : [];
  const videos: ExtractedPostVideo[] = [];

  items.forEach((item, itemIndex) => {
    if (!item || item.type !== "video") return;
    const url = typeof item.url === "string" ? item.url.trim() : "";
    if (!url || !isStoredUploadUrl(url)) return;
    const caption = typeof item.caption === "string" ? item.caption.trim() : "";
    videos.push({
      itemIndex,
      url,
      poster: storedPoster(item.poster),
      alt: typeof item.alt === "string" ? item.alt : "Video",
      caption: caption || null,
      trim: asTrim(item.trim),
    });
  });

  if (videos.length) return videos;

  const legacyUrl = typeof row.video_url === "string" ? row.video_url.trim() : "";
  if (row.type === "video" && legacyUrl && isStoredUploadUrl(legacyUrl)) {
    videos.push({
      itemIndex: 0,
      url: legacyUrl,
      poster: storedPoster(row.images?.[0]?.url),
      alt: row.images?.[0]?.alt || "Video",
      caption: null,
      trim: null,
    });
  }

  return videos;
}

function clip(value: string, max = 140) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

function usableAlt(alt: string) {
  const clean = alt.replace(/\s+/g, " ").trim();
  if (!clean || GENERIC_ALTS.has(clean.toLowerCase())) return "";
  return clean;
}

/** Card title: the video caption, otherwise the post text. Extra videos from the same post get a number. */
export function postVideoTitle(text: string, video: ExtractedPostVideo, videoCount: number, ordinal: number) {
  if (video.caption) return clip(video.caption);
  const line = text
    .split("\n")
    .map((part) => part.trim())
    .find(Boolean);
  const base = clip(line || usableAlt(video.alt) || "Video", videoCount > 1 ? 120 : 140);
  if (videoCount > 1) return `${base} · ${ordinal + 1}`;
  return base;
}

export function formatDurationLabel(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const safe = Math.round(seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remain = safe % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(remain).padStart(2, "0")}`;
  return `${minutes}:${String(remain).padStart(2, "0")}`;
}

export function formatPostedAgo(postedAt: Date) {
  const minutes = Math.floor((Date.now() - postedAt.getTime()) / 60_000);
  if (!Number.isFinite(minutes) || minutes < 1) return "Just now";
  if (minutes < 60) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? "1 day ago" : `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? "1 month ago" : `${months} months ago`;
  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}
