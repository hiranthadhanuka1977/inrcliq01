import { prisma } from "@/lib/prisma";

function isMissingHiddenModel(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("FeedHiddenPost") ||
    message.includes("feedHiddenPost") ||
    message.includes("does not exist")
  );
}

export async function getHiddenPostIdsForUser(userId: string): Promise<Set<string>> {
  try {
    if (typeof prisma.feedHiddenPost?.findMany !== "function") {
      return new Set();
    }
    const rows = await prisma.feedHiddenPost.findMany({
      where: { userId },
      select: { postId: true },
    });
    return new Set(rows.map((row) => row.postId));
  } catch (error) {
    if (isMissingHiddenModel(error)) return new Set();
    throw error;
  }
}

export async function hidePostFromFeed(userId: string, postId: string) {
  if (typeof prisma.feedHiddenPost?.upsert !== "function") {
    throw new Error("FeedHiddenPost model is not available.");
  }

  return prisma.feedHiddenPost.upsert({
    where: {
      userId_postId: { userId, postId },
    },
    create: { userId, postId },
    update: {},
  });
}

export async function deleteOwnFeedPost(userId: string, postId: string) {
  const post = await prisma.feedPost.findUnique({
    where: { id: postId },
    select: {
      id: true,
      userId: true,
      creator: { select: { userId: true } },
    },
  });

  if (!post) {
    return { ok: false as const, status: 404, error: "Post not found." };
  }

  const ownsPost = post.userId === userId || post.creator.userId === userId;
  if (!ownsPost) {
    return { ok: false as const, status: 403, error: "You can only delete your own posts." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.feedPost.delete({ where: { id: postId } });

    if (typeof tx.feedHiddenPost?.deleteMany === "function") {
      await tx.feedHiddenPost.deleteMany({ where: { postId } });
    }

    const profile = await tx.userProfile.findUnique({
      where: { userId },
      select: { pinnedFeedPostIds: true, postsCountLabel: true },
    });

    if (profile) {
      const pinned = profile.pinnedFeedPostIds.filter((id) => id !== postId);
      const nextCount =
        typeof profile.postsCountLabel === "number"
          ? Math.max(0, profile.postsCountLabel - 1)
          : profile.postsCountLabel;
      await tx.userProfile.update({
        where: { userId },
        data: {
          pinnedFeedPostIds: pinned,
          postsCountLabel: nextCount,
        },
      });
    }
  });

  return { ok: true as const };
}
