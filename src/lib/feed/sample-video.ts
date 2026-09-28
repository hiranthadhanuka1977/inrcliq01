import type { FeedMedia } from "@/types/feed/feed";

/** Shared sample clip for feed video previews and the fullscreen viewer. */
export const SAMPLE_FEED_VIDEO_URL =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

/** Whether the feed plays a video for this media (its own clip or the shared sample). */
export function isPlayableVideoMedia(media: FeedMedia, membersOnly?: boolean): boolean {
  if (membersOnly) return false;
  if (media.video_url) return true;
  if (media.use_sample_video === false) return false;
  if (media.type === "video") return true;
  if (media.type === "collage" && media.images.length > 1) return true;
  return media.type === "image" && media.images.length === 1;
}
