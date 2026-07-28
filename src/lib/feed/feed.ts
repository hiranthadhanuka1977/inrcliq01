import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getFollowedCreatorIdsForUser } from "@/lib/feed/follow-service";
import { getProfileSlugFromHandle } from "@/lib/feed/profile-slugs";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import type { FeedAuthor, FeedAudio, FeedData, FeedItem, FeedMedia } from "@/types/feed/feed";

function mapCreatorToAuthor(creator: {
  name: string;
  handle: string;
  avatarInitials: string;
  avatarColor: string;
  avatarUrl: string | null;
  verified: boolean;
}): FeedAuthor {
  return {
    name: creator.name,
    handle: creator.handle,
    avatar_initials: creator.avatarInitials,
    avatar_color: creator.avatarColor,
    avatar_url: creator.avatarUrl,
    verified: creator.verified,
  };
}

function mapPostToFeedItem(
  post: {
    id: string;
    creatorId: string;
    category: string;
    text: string;
    tags: string[];
    mediaJson: unknown;
    audioJson: unknown;
    likes: number;
    comments: number;
    shares: number;
    following: boolean;
    membersOnly: boolean;
    postedAt: Date;
    postedAgo: string | null;
    creator: {
      id?: string;
      name: string;
      handle: string;
      avatarInitials: string;
      avatarColor: string;
      avatarUrl: string | null;
      verified: boolean;
    };
  },
  options?: {
    followingOverride?: boolean;
    subscribed?: boolean;
  },
): FeedItem {
  return {
    id: post.id,
    category: post.category,
    author: mapCreatorToAuthor(post.creator),
    text: post.text,
    tags: post.tags,
    media: (post.mediaJson as FeedMedia | null) ?? null,
    audio: (post.audioJson as FeedAudio | null) ?? null,
    engagement: {
      likes: post.likes,
      comments: post.comments,
      shares: post.shares,
    },
    relationship: {
      following: options?.followingOverride ?? post.following,
      subscribed: options?.subscribed || undefined,
    },
    posted_at: post.postedAt.toISOString(),
    posted_ago: post.postedAgo ?? "",
    members_only: post.membersOnly || undefined,
  };
}

function getFeedDataFromJson(): FeedData {
  const filePath = join(process.cwd(), "data", "my_feed.json");
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as FeedData;
}

async function applyFollowState(items: FeedItem[]): Promise<FeedItem[]> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return items.map((item) => ({
      ...item,
      relationship: { ...item.relationship, following: false },
    }));
  }

  const followedIds = await getFollowedCreatorIdsForUser(sessionUser.id);
  if (followedIds.size === 0) {
    return items.map((item) => ({
      ...item,
      relationship: { ...item.relationship, following: false },
    }));
  }

  const creators = await prisma.creatorUser.findMany({
    where: { id: { in: Array.from(followedIds) } },
    select: { id: true, handle: true, slug: true },
  });

  const followedSlugs = new Set<string>();
  for (const creator of creators) {
    if (creator.slug) followedSlugs.add(creator.slug);
    const fromHandle = getProfileSlugFromHandle(creator.handle);
    if (fromHandle) followedSlugs.add(fromHandle);
  }

  return items.map((item) => {
    const slug = getProfileSlugFromHandle(item.author.handle);
    const following = Boolean(slug && followedSlugs.has(slug));
    return {
      ...item,
      relationship: { ...item.relationship, following },
    };
  });
}

async function getSubscribedCreatorIds(creatorIds: string[]): Promise<Set<string>> {
  const subscribedCreatorIds = new Set<string>();
  if (creatorIds.length === 0) return subscribedCreatorIds;

  const sessionUser = await getSessionUser();
  if (!sessionUser) return subscribedCreatorIds;

  const rows = await prisma.creatorSubscription.findMany({
    where: {
      userId: sessionUser.id,
      status: "ACTIVE",
      creatorId: { in: creatorIds },
    },
    select: { creatorId: true },
  });

  for (const row of rows) subscribedCreatorIds.add(row.creatorId);
  return subscribedCreatorIds;
}

export async function getFeedData(): Promise<FeedData> {
  try {
    const [posts, postCount] = await Promise.all([
      prisma.feedPost.findMany({
        orderBy: [{ sortOrder: "asc" }, { postedAt: "desc" }],
        include: { creator: true },
      }),
      prisma.feedPost.count(),
    ]);

    if (postCount === 0) {
      const json = getFeedDataFromJson();
      return {
        ...json,
        items: await applyFollowState(json.items),
      };
    }

    const creatorIds = Array.from(new Set(posts.map((post) => post.creatorId)));
    const subscribedCreatorIds = await getSubscribedCreatorIds(creatorIds).catch(() => new Set<string>());

    const categories = Array.from(new Set(posts.map((post) => post.category)));
    const jsonMeta = getFeedDataFromJson();
    const items = await applyFollowState(
      posts.map((post) =>
        mapPostToFeedItem(post, {
          subscribed: subscribedCreatorIds.has(post.creatorId),
        }),
      ),
    );

    return {
      version: jsonMeta.version ?? "1.0",
      description: "INRCLIQ feed dataset (loaded from database)",
      generated_at: new Date().toISOString(),
      total_items: posts.length,
      categories: jsonMeta.categories?.length ? jsonMeta.categories : categories,
      items,
    };
  } catch (error) {
    console.error("getFeedData: falling back to JSON", error);
    const json = getFeedDataFromJson();
    try {
      return {
        ...json,
        items: await applyFollowState(json.items),
      };
    } catch {
      return json;
    }
  }
}
