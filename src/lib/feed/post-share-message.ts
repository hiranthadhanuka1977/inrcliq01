import { SAMPLE_FEED_VIDEO_URL } from "@/lib/feed/sample-video";
import type { FeedAudio, FeedItem, FeedMedia, FeedMediaItem } from "@/types/feed/feed";

export const POST_SHARE_PREFIX = "__ICQ_POST__:";

export type PostSharePayload = {
  postId: string;
  authorName: string;
  authorHandle: string;
  authorSlug: string | null;
  text: string;
  imageUrl: string | null;
  imageAlt: string | null;
  /** Clip used as a still when the post has no poster. */
  videoUrl: string | null;
  hasVideo: boolean;
  membersOnly: boolean;
};

export function encodePostShare(payload: PostSharePayload) {
  return `${POST_SHARE_PREFIX}${JSON.stringify(payload)}`;
}

export function parsePostShare(body: string): PostSharePayload | null {
  if (!body.startsWith(POST_SHARE_PREFIX)) return null;
  try {
    const parsed = JSON.parse(body.slice(POST_SHARE_PREFIX.length)) as PostSharePayload;
    if (!parsed?.postId?.trim() || !parsed.authorName?.trim()) return null;
    return {
      postId: parsed.postId.trim(),
      authorName: parsed.authorName.trim(),
      authorHandle: parsed.authorHandle?.trim() || "",
      authorSlug: parsed.authorSlug?.trim() || null,
      text: parsed.text?.trim() || "",
      imageUrl: parsed.membersOnly ? null : parsed.imageUrl?.trim() || null,
      imageAlt: parsed.imageAlt?.trim() || null,
      videoUrl: parsed.membersOnly ? null : parsed.videoUrl?.trim() || null,
      hasVideo: Boolean(parsed.hasVideo) && !parsed.membersOnly,
      membersOnly: Boolean(parsed.membersOnly),
    };
  } catch {
    return null;
  }
}

export function postSharePreview(payload: PostSharePayload) {
  const text = payload.text.replace(/\s+/g, " ").trim();
  if (text) {
    const snippet = text.length > 80 ? `${text.slice(0, 77).trimEnd()}…` : text;
    return `Shared a post: ${snippet}`;
  }
  return `Shared a post by ${payload.authorName}`;
}

export function postShareHref(postId: string) {
  return `/feed/post/${encodeURIComponent(postId)}`;
}

function snippet(text: string, max = 180) {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function displayHandle(handle: string) {
  const trimmed = handle.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

function mediaStill(item: FeedMediaItem | undefined) {
  if (!item) return null;
  if (item.type === "image" && item.url) return { url: item.url, alt: item.alt || "Post" };
  if (item.poster) return { url: item.poster, alt: item.alt || "Post" };
  return null;
}

/** Picture or clip the message card can show. Safe to call in the browser. */
export function shareStill(input: {
  membersOnly?: boolean;
  media: FeedMedia | null;
  audios?: FeedAudio[] | null;
}) {
  const membersOnly = Boolean(input.membersOnly);
  const media = input.media;
  const fromItems = media?.items
    ?.map((entry) => mediaStill(entry))
    .find((entry): entry is { url: string; alt: string } => Boolean(entry));
  const image =
    fromItems ??
    (media?.images?.[0]?.url ? { url: media.images[0].url, alt: media.images[0].alt || "Post" } : null);
  const audioThumb = input.audios?.find((audio) => audio.thumbnail?.url?.trim())?.thumbnail;
  const hasVideo = Boolean(
    media &&
      (media.type === "video" || media.video_url || media.items?.some((entry) => entry.type === "video")),
  );
  const imageUrl = membersOnly ? null : image?.url ?? audioThumb?.url?.trim() ?? null;
  let videoUrl: string | null = null;
  if (!membersOnly && hasVideo && !imageUrl) {
    const clip = media?.items?.find((entry) => entry.type === "video" && entry.url.trim());
    videoUrl = clip?.url.trim() || media?.video_url?.trim() || (media?.type === "video" ? SAMPLE_FEED_VIDEO_URL : null);
  }

  return {
    imageUrl,
    imageAlt: membersOnly ? null : image?.alt ?? audioThumb?.alt ?? null,
    videoUrl,
    hasVideo: hasVideo && !membersOnly,
  };
}

/** Snapshot stored in the message and shown on the send sheet. Safe to call in the browser. */
export function postSharePayload(item: FeedItem): PostSharePayload {
  const still = shareStill({
    membersOnly: item.members_only,
    media: item.media,
    audios: item.audios ?? (item.audio ? [item.audio] : []),
  });

  return {
    postId: item.id,
    authorName: item.author.name,
    authorHandle: displayHandle(item.author.handle),
    authorSlug: item.author.slug?.trim() || null,
    text: snippet(item.text),
    ...still,
    membersOnly: Boolean(item.members_only),
  };
}
