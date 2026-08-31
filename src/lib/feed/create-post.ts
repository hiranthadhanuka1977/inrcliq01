import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureCreatorUserForAuthUser } from "@/lib/feed/creator-user-bridge";
import type { FeedMedia } from "@/types/feed/feed";

const MAX_TEXT_LENGTH = 2000;

function newId() {
  return `c${randomBytes(12).toString("hex")}`;
}

function tagsFromText(text: string) {
  const matches = text.match(/#[a-z0-9_]+/gi) ?? [];
  return [...new Set(matches.map((tag) => tag.slice(1).toLowerCase()))].slice(0, 8);
}

export function normalizePostText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").trim();
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseImages(value: unknown): FeedMedia["images"] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as { url?: unknown; alt?: unknown };
      const url = asString(row.url);
      if (!url) return null;
      return { url, alt: asString(row.alt) || "Post image" };
    })
    .filter((item): item is FeedMedia["images"][number] => item !== null)
    .slice(0, 6);
}

function parseFeeling(value: unknown): FeedMedia["feeling"] {
  if (!value || typeof value !== "object") return undefined;
  const row = value as { kind?: unknown; emoji?: unknown; label?: unknown };
  const kind = row.kind === "activity" ? "activity" : row.kind === "feeling" ? "feeling" : null;
  const emoji = asString(row.emoji);
  const label = asString(row.label);
  if (!kind || !emoji || !label) return undefined;
  return { kind, emoji, label };
}

function parseLocation(value: unknown): FeedMedia["location"] {
  if (!value || typeof value !== "object") return undefined;
  const row = value as { label?: unknown; lat?: unknown; lng?: unknown };
  const label = asString(row.label);
  if (!label) return undefined;
  const lat = typeof row.lat === "number" ? row.lat : undefined;
  const lng = typeof row.lng === "number" ? row.lng : undefined;
  return { label, lat, lng };
}

function parseTagged(value: unknown): NonNullable<FeedMedia["tagged"]> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as { name?: unknown; handle?: unknown; slug?: unknown };
      const name = asString(row.name);
      const handle = asString(row.handle);
      if (!name || !handle) return null;
      return { name, handle, slug: asString(row.slug) || null };
    })
    .filter((item): item is NonNullable<FeedMedia["tagged"]>[number] => item !== null)
    .slice(0, 8);
}

function buildMediaJson(payload: {
  images: FeedMedia["images"];
  videoUrl: string | null;
  feeling: FeedMedia["feeling"];
  location: FeedMedia["location"];
  tagged: NonNullable<FeedMedia["tagged"]>;
}): FeedMedia | null {
  const { images, videoUrl, feeling, location, tagged } = payload;
  if (!images.length && !videoUrl && !feeling && !location && tagged.length === 0) {
    return null;
  }

  const type: FeedMedia["type"] = videoUrl ? "video" : images.length > 1 ? "collage" : "image";
  return {
    type,
    images,
    video_url: videoUrl,
    use_sample_video: false,
    feeling,
    location,
    tagged: tagged.length ? tagged : undefined,
  };
}

export async function createOwnTextPost(userId: string, raw: unknown) {
  const payload = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const text = normalizePostText(payload.text);
  if (text.length > MAX_TEXT_LENGTH) {
    return {
      ok: false as const,
      status: 400,
      error: `Keep your first post under ${MAX_TEXT_LENGTH} characters.`,
    };
  }

  const images = parseImages(payload.images);
  const videoUrl = asString(payload.videoUrl) || asString(payload.video_url) || null;
  const gifUrl = asString(payload.gifUrl);
  if (gifUrl && !images.some((image) => image.url === gifUrl)) {
    images.unshift({ url: gifUrl, alt: asString(payload.gifAlt) || "GIF" });
  }

  const feeling = parseFeeling(payload.feeling);
  const location = parseLocation(payload.location);
  const tagged = parseTagged(payload.tagged);
  const media = buildMediaJson({ images, videoUrl, feeling, location, tagged });
  const wantsExclusive =
    payload.membersOnly === true ||
    payload.members_only === true ||
    payload.exclusive === true;

  if (!text && !media) {
    return { ok: false as const, status: 400, error: "Write an update or add something to your post." };
  }

  const creator = await ensureCreatorUserForAuthUser(userId);
  if (!creator) {
    return {
      ok: false as const,
      status: 409,
      error: "Finish setting up your profile before posting.",
    };
  }

  const profileVerified = await prisma.userProfile.findUnique({
    where: { userId },
    select: { verified: true },
  });
  const canPostExclusive = Boolean(profileVerified?.verified || creator.verified);
  const membersOnly = wantsExclusive && canPostExclusive;

  const postId = newId();
  await prisma.feedPost.create({
    data: {
      id: postId,
      category: "personal",
      text,
      tags: tagsFromText(text),
      mediaJson: media as unknown as Prisma.InputJsonValue | undefined,
      likes: 0,
      comments: 0,
      shares: 0,
      following: false,
      membersOnly,
      postedAt: new Date(),
      postedAgo: "Just now",
      sortOrder: 0,
      creatorId: creator.id,
      userId,
    },
  });

  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { pinnedFeedPostIds: true, postsCountLabel: true, slug: true },
  });

  if (profile) {
    const pinned = profile.pinnedFeedPostIds.includes(postId)
      ? profile.pinnedFeedPostIds
      : [postId, ...profile.pinnedFeedPostIds];
    await prisma.userProfile.update({
      where: { userId },
      data: {
        pinnedFeedPostIds: pinned,
        postsCountLabel: Math.max(1, (profile.postsCountLabel ?? 0) + 1),
      },
    });
  }

  return {
    ok: true as const,
    postId,
    profileHref: creator.slug
      ? `/feed/profile/${creator.slug}`
      : profile?.slug
        ? `/feed/profile/${profile.slug}`
        : null,
  };
}
