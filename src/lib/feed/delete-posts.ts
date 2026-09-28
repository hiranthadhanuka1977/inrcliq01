import { unlink } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import type { FeedAudio, FeedMedia } from "@/types/feed/feed";

/** Folder the feed composer uploads into (see /api/feed/uploads). Files elsewhere are never deleted. */
const FEED_UPLOAD_PREFIX = "uploads/feed-posts/";

/** Showcase profiles display a fixed demo post count rather than a live tally. */
const DEMO_COUNT_PROFILE_SOURCE = "profile-json";

function feedUploadPathname(url: string): string | null {
  const value = url.trim();
  if (value.startsWith(`/${FEED_UPLOAD_PREFIX}`)) return value.slice(1);
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".blob.vercel-storage.com")) return null;
    const pathname = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
    return pathname.startsWith(FEED_UPLOAD_PREFIX) ? pathname : null;
  } catch {
    return null;
  }
}

function postMediaUrls(mediaJson: unknown, audioJson: unknown): string[] {
  const media = mediaJson as Partial<FeedMedia> | null;
  const audio = audioJson as Partial<FeedAudio> | null;
  return [
    ...(Array.isArray(media?.images) ? media.images.map((image) => image?.url) : []),
    media?.video_url,
    audio?.audio_url,
    audio?.thumbnail?.url,
  ].filter((url): url is string => typeof url === "string" && url.length > 0);
}

async function isStillReferenced(url: string) {
  const [row] = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM "FeedPost"
    WHERE strpos(COALESCE("mediaJson"::text, ''), ${url}) > 0
       OR strpos(COALESCE("audioJson"::text, ''), ${url}) > 0`;
  return (row?.count ?? 0) > 0;
}

/** Removes uploaded feed files that no remaining post uses. Failures are logged, never thrown. */
async function removeUploadedFiles(urls: string[]) {
  const uploadRoot = resolve(process.cwd(), "public", FEED_UPLOAD_PREFIX);

  for (const url of new Set(urls)) {
    const pathname = feedUploadPathname(url);
    if (!pathname) continue;

    try {
      if (await isStillReferenced(url)) continue;

      if (url.startsWith("/")) {
        const filePath = resolve(join(process.cwd(), "public", pathname));
        if (!filePath.startsWith(uploadRoot + sep)) continue;
        await unlink(filePath).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== "ENOENT") throw error;
        });
      } else {
        await del(url);
      }
    } catch (error) {
      console.error(`Unable to remove uploaded feed file ${url}`, error);
    }
  }
}

/**
 * Deletes feed posts and everything that only exists for them: hide records, profile pins,
 * the author profile's post count, and uploaded media files. Authors and creator identities are kept.
 */
export async function deleteFeedPosts(postIds: string[]): Promise<number> {
  const ids = [...new Set(postIds)];
  if (!ids.length) return 0;

  const posts = await prisma.feedPost.findMany({
    where: { id: { in: ids } },
    select: { id: true, userId: true, mediaJson: true, audioJson: true, creator: { select: { userId: true } } },
  });
  if (!posts.length) return 0;

  const foundIds = posts.map((post) => post.id);
  const deletedByAuthor = new Map<string, number>();
  for (const post of posts) {
    const authorId = post.userId ?? post.creator.userId;
    if (authorId) deletedByAuthor.set(authorId, (deletedByAuthor.get(authorId) ?? 0) + 1);
  }

  const deleted = await prisma.$transaction(async (tx) => {
    await tx.feedHiddenPost.deleteMany({ where: { postId: { in: foundIds } } });

    const pinnedProfiles = await tx.userProfile.findMany({
      where: { pinnedFeedPostIds: { hasSome: foundIds } },
      select: { userId: true, pinnedFeedPostIds: true },
    });
    for (const profile of pinnedProfiles) {
      await tx.userProfile.update({
        where: { userId: profile.userId },
        data: { pinnedFeedPostIds: profile.pinnedFeedPostIds.filter((id) => !foundIds.includes(id)) },
      });
    }

    const authorProfiles = await tx.userProfile.findMany({
      where: {
        userId: { in: [...deletedByAuthor.keys()] },
        postsCountLabel: { not: null },
        source: { not: DEMO_COUNT_PROFILE_SOURCE },
      },
      select: { userId: true, postsCountLabel: true },
    });
    for (const profile of authorProfiles) {
      await tx.userProfile.update({
        where: { userId: profile.userId },
        data: {
          postsCountLabel: Math.max(0, (profile.postsCountLabel ?? 0) - (deletedByAuthor.get(profile.userId) ?? 0)),
        },
      });
    }

    const { count } = await tx.feedPost.deleteMany({ where: { id: { in: foundIds } } });
    return count;
  });

  await removeUploadedFiles(posts.flatMap((post) => postMediaUrls(post.mediaJson, post.audioJson)));
  return deleted;
}
