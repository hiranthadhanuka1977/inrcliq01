import { prisma } from "@/lib/prisma";
import type { FeedItem } from "@/types/feed/feed";

function isMissingBookmarkModel(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("FeedBookmark") ||
    message.includes("feedBookmark") ||
    message.includes("does not exist")
  );
}

export async function getBookmarkedPostIdsForUser(
  userId: string,
  postIds?: string[],
): Promise<Set<string>> {
  try {
    if (typeof prisma.feedBookmark?.findMany !== "function") return new Set();
    const rows = await prisma.feedBookmark.findMany({
      where: {
        userId,
        ...(postIds && postIds.length > 0 ? { postId: { in: postIds } } : {}),
      },
      select: { postId: true },
    });
    return new Set(rows.map((row) => row.postId));
  } catch (error) {
    if (isMissingBookmarkModel(error)) return new Set();
    throw error;
  }
}

export async function markBookmarkedPosts(userId: string | null | undefined, items: FeedItem[]) {
  if (!userId || items.length === 0) return items;
  const ids = await getBookmarkedPostIdsForUser(
    userId,
    items.map((item) => item.id),
  );
  if (ids.size === 0) return items;
  return items.map((item) => (ids.has(item.id) ? { ...item, bookmarked: true } : item));
}

export async function listSavedPostsForUser(userId: string) {
  if (typeof prisma.feedBookmark?.findMany !== "function") {
    throw new Error("FeedBookmark model is not available.");
  }

  const rows = await prisma.feedBookmark.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      post: { include: { creator: true } },
    },
  });

  return rows.map((row) => row.post);
}

export async function saveFeedBookmark(userId: string, postId: string) {
  if (typeof prisma.feedBookmark?.upsert !== "function") {
    throw new Error("FeedBookmark model is not available.");
  }

  const post = await prisma.feedPost.findUnique({
    where: { id: postId },
    select: { id: true },
  });
  if (!post) {
    return { ok: false as const, status: 404, error: "Post not found." };
  }

  await prisma.feedBookmark.upsert({
    where: { userId_postId: { userId, postId } },
    create: { userId, postId },
    update: {},
  });

  return { ok: true as const, bookmarked: true };
}

export async function removeFeedBookmark(userId: string, postId: string) {
  if (typeof prisma.feedBookmark?.deleteMany !== "function") {
    throw new Error("FeedBookmark model is not available.");
  }

  await prisma.feedBookmark.deleteMany({
    where: { userId, postId },
  });

  return { ok: true as const, bookmarked: false };
}
