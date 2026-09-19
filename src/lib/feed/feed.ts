import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getFollowedCreatorIdsForUser } from "@/lib/feed/follow-service";
import { getHiddenPostIdsForUser } from "@/lib/feed/post-actions";
import { getProfileSlugFromHandle, resolveAuthorProfileSlug } from "@/lib/feed/profile-slugs";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import type { FeedAuthor, FeedAudio, FeedData, FeedItem, FeedMedia } from "@/types/feed/feed";

function mapCreatorToAuthor(creator: {
  name: string;
  handle: string;
  slug?: string | null;
  avatarInitials: string;
  avatarColor: string;
  avatarUrl: string | null;
  verified: boolean;
}): FeedAuthor {
  return {
    name: creator.name,
    handle: creator.handle,
    slug: creator.slug ?? getProfileSlugFromHandle(creator.handle),
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
      slug?: string | null;
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
  const clearFollowing = () =>
    items.map((item) => ({
      ...item,
      relationship: { ...item.relationship, following: false },
      is_own: false,
    }));

  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return clearFollowing();

    const [profile, linkedCreator, followedIds] = await Promise.all([
      prisma.userProfile.findUnique({
        where: { userId: sessionUser.id },
        select: { handle: true, slug: true },
      }),
      prisma.creatorUser.findFirst({
        where: { userId: sessionUser.id },
        select: { handle: true, slug: true },
      }),
      getFollowedCreatorIdsForUser(sessionUser.id),
    ]);

    const ownHandles = new Set<string>();
    const ownSlugs = new Set<string>();
    for (const handle of [sessionUser.handle, profile?.handle, linkedCreator?.handle]) {
      if (!handle?.trim()) continue;
      const normalized = handle.trim().toLowerCase();
      ownHandles.add(normalized.startsWith("@") ? normalized : `@${normalized}`);
      ownHandles.add(normalized.replace(/^@/, ""));
    }
    for (const slug of [profile?.slug, linkedCreator?.slug]) {
      if (slug?.trim()) ownSlugs.add(slug.trim().toLowerCase());
    }

    const isOwnItem = (item: FeedItem) => {
      const handle = item.author.handle.trim().toLowerCase();
      const withAt = handle.startsWith("@") ? handle : `@${handle}`;
      const bare = handle.replace(/^@/, "");
      const slug = (item.author.slug ?? resolveAuthorProfileSlug(item.author.handle, item.author.slug))
        .trim()
        .toLowerCase();
      return (
        ownHandles.has(handle) ||
        ownHandles.has(withAt) ||
        ownHandles.has(bare) ||
        (slug ? ownSlugs.has(slug) : false)
      );
    };

    if (followedIds.size === 0) {
      return items.map((item) => ({
        ...item,
        relationship: { ...item.relationship, following: false },
        is_own: isOwnItem(item) || undefined,
      }));
    }

    const creators = await prisma.creatorUser.findMany({
      where: { id: { in: Array.from(followedIds) } },
      select: { id: true, handle: true, slug: true },
    });

    const followedSlugs = new Set<string>();
    const followedHandles = new Set<string>();
    for (const creator of creators) {
      if (creator.slug) followedSlugs.add(creator.slug);
      followedHandles.add(creator.handle.toLowerCase());
      const fromHandle = getProfileSlugFromHandle(creator.handle);
      if (fromHandle) followedSlugs.add(fromHandle);
    }

    return items.map((item) => {
      const handle = item.author.handle.startsWith("@") ? item.author.handle : `@${item.author.handle}`;
      const slug = resolveAuthorProfileSlug(item.author.handle, item.author.slug);
      const own = isOwnItem(item);
      const following =
        !own &&
        (followedHandles.has(handle.toLowerCase()) ||
          followedSlugs.has(slug) ||
          Boolean(item.author.slug && followedSlugs.has(item.author.slug)));
      return {
        ...item,
        author: {
          ...item.author,
          slug: item.author.slug ?? slug,
        },
        relationship: { ...item.relationship, following },
        is_own: own || undefined,
      };
    });
  } catch (error) {
    console.error("applyFollowState: defaulting to no follows", error);
    return clearFollowing();
  }
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

async function excludeHiddenPosts(items: FeedItem[]): Promise<FeedItem[]> {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return items;
    const hiddenIds = await getHiddenPostIdsForUser(sessionUser.id);
    if (hiddenIds.size === 0) return items;
    return items.filter((item) => !hiddenIds.has(item.id));
  } catch (error) {
    console.error("excludeHiddenPosts: skipping hide filter", error);
    return items;
  }
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
      const handles = Array.from(
        new Set(json.items.map((item) => item.author.handle.toLowerCase())),
      );
      const creators = await prisma.creatorUser.findMany({
        where: {
          OR: handles.flatMap((handle) => {
            const withAt = handle.startsWith("@") ? handle : `@${handle}`;
            const bare = handle.replace(/^@/, "");
            return [{ handle: withAt }, { handle: bare }, { handle: `@${bare}` }];
          }),
        },
        select: { handle: true, slug: true, verified: true },
      });
      const byHandle = new Map(
        creators.map((creator) => [creator.handle.toLowerCase(), creator]),
      );
      const withSlugs = json.items.map((item) => {
        const key = item.author.handle.toLowerCase();
        const withAt = key.startsWith("@") ? key : `@${key}`;
        const match = byHandle.get(key) ?? byHandle.get(withAt) ?? byHandle.get(key.replace(/^@/, ""));
        const slug = resolveAuthorProfileSlug(item.author.handle, match?.slug);
        return {
          ...item,
          author: {
            ...item.author,
            slug,
            verified: match ? match.verified : item.author.verified,
          },
        };
      });
      const items = await excludeHiddenPosts(await applyFollowState(withSlugs));
      return {
        ...json,
        total_items: items.length,
        items,
      };
    }

    const creatorIds = Array.from(new Set(posts.map((post) => post.creatorId)));
    const subscribedCreatorIds = await getSubscribedCreatorIds(creatorIds).catch(() => new Set<string>());

    const categories = Array.from(new Set(posts.map((post) => post.category)));
    const jsonMeta = getFeedDataFromJson();
    const items = await excludeHiddenPosts(
      await applyFollowState(
        posts.map((post) =>
          mapPostToFeedItem(post, {
            subscribed: subscribedCreatorIds.has(post.creatorId),
          }),
        ),
      ),
    );

    return {
      version: jsonMeta.version ?? "1.0",
      description: "INRCLIQ feed dataset (loaded from database)",
      generated_at: new Date().toISOString(),
      total_items: items.length,
      categories: jsonMeta.categories?.length ? jsonMeta.categories : categories,
      items,
    };
  } catch (error) {
    console.error("getFeedData: falling back to JSON", error);
    const json = getFeedDataFromJson();
    const withSlugs = json.items.map((item) => ({
      ...item,
      author: {
        ...item.author,
        slug: resolveAuthorProfileSlug(item.author.handle, item.author.slug),
      },
    }));
    const items = await excludeHiddenPosts(await applyFollowState(withSlugs));
    return {
      ...json,
      total_items: items.length,
      items,
    };
  }
}
