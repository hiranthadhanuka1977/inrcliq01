import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getCreatorCollectionRaw } from "@/lib/feed/collection";
import { getCollectionPreviewProducts } from "@/lib/seller/collection-helpers";
import { isFollowingCreator } from "@/lib/feed/follow-service";
import { getSubscriptionForUser } from "@/lib/feed/subscription-service";
import { prisma } from "@/lib/prisma";
import { resolveSpecialRequestsAvailable, resolveSpecialRequestsEnabled } from "@/lib/seller/service-requests-store";
import { getSessionUser } from "@/lib/session";
import type { FeedAudio, FeedAuthor, FeedItem, FeedMedia } from "@/types/feed/feed";
import type {
  ProfileCollectionItem,
  ProfileData,
  ProfilePopularPost,
} from "@/types/feed/profile";

const PROFILE_FILES: Record<string, string> = {
  "mia-chen": "mia-chen.json",
  "dev-weekly": "dev-weekly.json",
  hiran: "hiran.json",
  "planet-unfolded": "planet-unfolded.json",
  "good-guy-podcast": "good-guy-podcast.json",
  "bathiya-santhush": "bathiya-santhush.json",
  "billie-eilish": "billie-eilish.json",
  "hard-fork": "hard-fork.json",
  "james-clear": "james-clear.json",
  "taylor-swift": "taylor-swift.json",
  "inrcliq-originals": "inrcliq-originals.json",
};

function normalizeHandle(handle: string | null | undefined) {
  return (handle || "").replace(/^@/, "").trim().toLowerCase();
}

function resolveIsOwnProfile(
  sessionUser: { id: string; handle: string | null } | null,
  ownerUserId: string | null | undefined,
  profileHandle: string,
) {
  if (!sessionUser) return false;
  if (ownerUserId && sessionUser.id === ownerUserId) return true;
  const sessionHandle = normalizeHandle(sessionUser.handle);
  const targetHandle = normalizeHandle(profileHandle);
  return Boolean(sessionHandle && targetHandle && sessionHandle === targetHandle);
}

function getProfileDataFromJson(slug: string): ProfileData | null {
  const fileName = PROFILE_FILES[slug];
  if (!fileName) return null;

  const filePath = join(process.cwd(), "data", fileName);
  if (!existsSync(filePath)) return null;

  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as ProfileData;
}

function mapCollectionPreview(products: {
  id: string;
  name: string;
  price: string;
  image: string;
  image_alt: string;
}[]): ProfileCollectionItem[] {
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    image: product.image,
    image_alt: product.image_alt,
  }));
}

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
    slug: creator.slug ?? null,
    avatar_initials: creator.avatarInitials,
    avatar_color: creator.avatarColor,
    avatar_url: creator.avatarUrl,
    verified: creator.verified,
  };
}

function mapDbPostToFeedItem(
  post: {
    id: string;
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
      name: string;
      handle: string;
      slug?: string | null;
      avatarInitials: string;
      avatarColor: string;
      avatarUrl: string | null;
      verified: boolean;
    };
  },
  options?: { following?: boolean; subscribed?: boolean },
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
      following: options?.following ?? post.following,
      subscribed: options?.subscribed || undefined,
    },
    posted_at: post.postedAt.toISOString(),
    posted_ago: post.postedAgo ?? "",
    members_only: post.membersOnly || undefined,
  };
}

async function getCreatorFeedPosts(
  slug: string,
  preferredIds: string[],
  options?: { following?: boolean; subscribed?: boolean },
): Promise<FeedItem[]> {
  if (preferredIds.length === 0) return [];

  const posts = await prisma.feedPost.findMany({
    where: {
      creator: { slug },
      id: { in: preferredIds },
    },
    include: { creator: true },
  });

  if (posts.length === 0) return [];

  const byId = new Map(posts.map((post) => [post.id, post]));
  return preferredIds
    .map((id) => {
      const post = byId.get(id);
      return post ? mapDbPostToFeedItem(post, options) : null;
    })
    .filter((post): post is FeedItem => post !== null);
}

async function getFeedPostsForUser(
  userId: string,
  options?: { following?: boolean; subscribed?: boolean },
): Promise<FeedItem[]> {
  const posts = await prisma.feedPost.findMany({
    where: { userId },
    orderBy: [{ postedAt: "desc" }, { sortOrder: "asc" }],
    include: { creator: true },
  });
  return posts.map((post) => mapDbPostToFeedItem(post, options));
}

function parsePopularPosts(value: unknown): ProfilePopularPost[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object") as ProfilePopularPost[];
}

type DbUserProfile = {
  slug: string | null;
  displayName: string;
  handle: string;
  avatarInitials: string;
  avatarColor: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string;
  verified: boolean;
  specialRequests: boolean;
  subscriptionPriceLabel: string | null;
  followersLabel: string | null;
  followingCount: number;
  subscribersCount: number;
  postsCountLabel: number | null;
  popularPostsJson: unknown;
  pinnedFeedPostIds: string[];
  source: string;
  userId: string;
};

async function getDbUserProfile(slug: string): Promise<DbUserProfile | null> {
  // Guard against a stale Prisma singleton after schema changes (dev HMR).
  if (typeof prisma.userProfile?.findFirst !== "function") {
    console.error(
      "getDbUserProfile: prisma.userProfile is unavailable. Restart the dev server after `npx prisma generate`.",
    );
    return null;
  }

  return prisma.userProfile.findFirst({
    where: { slug },
    select: {
      slug: true,
      displayName: true,
      handle: true,
      avatarInitials: true,
      avatarColor: true,
      avatarUrl: true,
      coverUrl: true,
      bio: true,
      verified: true,
      specialRequests: true,
      subscriptionPriceLabel: true,
      followersLabel: true,
      followingCount: true,
      subscribersCount: true,
      postsCountLabel: true,
      popularPostsJson: true,
      pinnedFeedPostIds: true,
      source: true,
      userId: true,
    },
  });
}

function profileFromDbRow(row: DbUserProfile, feedPosts: FeedItem[]): ProfileData {
  const postCount = row.postsCountLabel ?? feedPosts.length;
  return {
    slug: row.slug || "",
    name: row.displayName,
    handle: row.handle,
    avatar_initials: row.avatarInitials,
    avatar_color: row.avatarColor,
    avatar_url: row.avatarUrl,
    verified: row.verified,
    cover_url: row.coverUrl,
    bio: row.bio,
    special_requests: row.specialRequests || undefined,
    stats: {
      followers: row.followersLabel ?? "0",
      following: row.followingCount,
      subscribers: row.subscribersCount,
      posts: postCount,
    },
    subscription: row.subscriptionPriceLabel
      ? { price_label: row.subscriptionPriceLabel }
      : null,
    collection: [],
    popular_posts: parsePopularPosts(row.popularPostsJson),
    feed_posts: feedPosts,
  };
}

/** Prefer DB `UserProfile`, fall back to JSON. Overlays collection / follow / subscribe. */
export async function getProfileData(slug: string): Promise<ProfileData | null> {
  const dbProfile = await getDbUserProfile(slug).catch((error) => {
    console.error("getProfileData: UserProfile lookup failed", error);
    return null;
  });

  if (dbProfile?.slug) {
    let collection: ProfileCollectionItem[] = [];
    let feedPosts: FeedItem[] = [];
    let subscribed = false;
    let following = false;

    try {
      const [rawCollection, creator, postCount] = await Promise.all([
        getCreatorCollectionRaw(slug),
        prisma.creatorUser.findFirst({
          where: { OR: [{ slug }, { userId: dbProfile.userId }] },
          select: { id: true, slug: true },
        }),
        prisma.feedPost.count({ where: { userId: dbProfile.userId } }),
      ]);

      // Keep a preview strip even when the storefront toggle is off (modal on click).
      if (rawCollection) {
        const previewProducts = getCollectionPreviewProducts(rawCollection);
        if (previewProducts.length) {
          collection = mapCollectionPreview(previewProducts);
        }
      }

      let sessionUser: Awaited<ReturnType<typeof getSessionUser>> = null;
      try {
        sessionUser = await getSessionUser();
      } catch {
        sessionUser = null;
      }

      const isOwn = resolveIsOwnProfile(sessionUser, dbProfile.userId, dbProfile.handle);

      if (sessionUser && creator && !isOwn) {
        const [subscription, isFollowing] = await Promise.all([
          getSubscriptionForUser(sessionUser.id, creator.id),
          isFollowingCreator(sessionUser.id, creator.id),
        ]);
        subscribed = subscription?.status === "ACTIVE";
        following = isFollowing;
      }

      // Rich profiles: pinned JSON order. Stub profiles: all linked FeedPosts.
      if (dbProfile.source === "stub") {
        feedPosts = await getFeedPostsForUser(dbProfile.userId, { following, subscribed });
      } else if (dbProfile.pinnedFeedPostIds.length > 0) {
        const creatorSlug = creator?.slug || slug;
        feedPosts = await getCreatorFeedPosts(creatorSlug, dbProfile.pinnedFeedPostIds, {
          following,
          subscribed,
        });

        const jsonFallback = getProfileDataFromJson(slug);
        if (!isOwn && jsonFallback?.feed_posts?.length) {
          const fromDbIds = new Set(feedPosts.map((post) => post.id));
          const leftovers = jsonFallback.feed_posts
            .filter((post) => !fromDbIds.has(post.id))
            .map((post) => ({
              ...post,
              relationship: {
                ...post.relationship,
                following,
                subscribed: subscribed || undefined,
              },
            }));
          feedPosts = [...feedPosts, ...leftovers];
        }
      } else {
        feedPosts = await getFeedPostsForUser(dbProfile.userId, { following, subscribed });
      }

      const base = profileFromDbRow(dbProfile, feedPosts);
      if (dbProfile.source === "stub") {
        base.stats.posts = feedPosts.length || postCount;
        base.verified = false;
      } else if (dbProfile.postsCountLabel == null) {
        base.stats.posts = Math.max(postCount, feedPosts.length);
      }

      const jsonFallback = getProfileDataFromJson(slug);
      // Only use profile JSON shop preview when no collection catalog exists at all.
      if (!collection.length && !rawCollection && jsonFallback?.collection?.length) {
        collection = jsonFallback.collection;
      }

      const specialRequestsAvailable = await resolveSpecialRequestsAvailable(slug);
      const specialRequestsEnabled =
        specialRequestsAvailable &&
        (await resolveSpecialRequestsEnabled(slug, dbProfile.specialRequests));
      // Own profile: keep the Special Requests entry visible from seed/catalog even if
      // the public toggle is currently off.
      const showSpecialRequests =
        specialRequestsAvailable || (isOwn && Boolean(jsonFallback?.special_requests));
      const collectionEnabled = rawCollection
        ? rawCollection.enabled !== false
        : collection.length > 0
          ? true
          : undefined;

      return {
        ...base,
        special_requests: showSpecialRequests || undefined,
        special_requests_enabled: specialRequestsEnabled,
        collection_enabled: collectionEnabled,
        is_own: isOwn || undefined,
        collection,
        relationship: { following, subscribed },
      };
    } catch (error) {
      console.error("getProfileData: DB profile overlay failed", error);
      const specialRequestsAvailable = await resolveSpecialRequestsAvailable(slug);
      const specialRequestsEnabled =
        specialRequestsAvailable &&
        (await resolveSpecialRequestsEnabled(slug, dbProfile.specialRequests));
      let sessionUser: Awaited<ReturnType<typeof getSessionUser>> = null;
      try {
        sessionUser = await getSessionUser();
      } catch {
        sessionUser = null;
      }
      return {
        ...profileFromDbRow(dbProfile, []),
        special_requests: specialRequestsAvailable || undefined,
        special_requests_enabled: specialRequestsEnabled,
        is_own: resolveIsOwnProfile(sessionUser, dbProfile.userId, dbProfile.handle) || undefined,
      };
    }
  }

  const profile = getProfileDataFromJson(slug);
  if (!profile) return null;

  let collection: ProfileCollectionItem[] = [];
  let feedPosts = profile.feed_posts;
  let subscribed = Boolean(profile.relationship?.subscribed);
  let following = Boolean(profile.relationship?.following);
  let isOwn = false;
  let collectionEnabled: boolean | undefined;

  try {
    const preferredIds = profile.feed_posts.map((post) => post.id);
    const [rawCollection, creator] = await Promise.all([
      getCreatorCollectionRaw(slug),
      prisma.creatorUser.findFirst({ where: { slug }, select: { id: true, userId: true } }),
    ]);

    if (rawCollection) {
      const previewProducts = getCollectionPreviewProducts(rawCollection);
      if (previewProducts.length) {
        collection = mapCollectionPreview(previewProducts);
      }
      collectionEnabled = rawCollection.enabled !== false;
    } else if (profile.collection.length) {
      collection = profile.collection;
      collectionEnabled = true;
    }

    let sessionUser: Awaited<ReturnType<typeof getSessionUser>> = null;
    try {
      sessionUser = await getSessionUser();
    } catch {
      sessionUser = null;
    }

    isOwn = resolveIsOwnProfile(sessionUser, creator?.userId, profile.handle);

    if (sessionUser && creator && !isOwn) {
      const [subscription, isFollowing] = await Promise.all([
        getSubscriptionForUser(sessionUser.id, creator.id),
        isFollowingCreator(sessionUser.id, creator.id),
      ]);
      subscribed = subscription?.status === "ACTIVE";
      following = isFollowing;
    } else if (!sessionUser || isOwn) {
      subscribed = false;
      following = false;
    }

    const dbFeed = await getCreatorFeedPosts(slug, preferredIds, { following, subscribed });
    if (isOwn) {
      feedPosts = dbFeed;
    } else if (dbFeed.length) {
      const fromDbIds = new Set(dbFeed.map((post) => post.id));
      const leftovers = profile.feed_posts
        .filter((post) => !fromDbIds.has(post.id))
        .map((post) => ({
          ...post,
          relationship: {
            ...post.relationship,
            following,
            subscribed: subscribed || undefined,
          },
        }));
      feedPosts = [...dbFeed, ...leftovers];
    } else {
      feedPosts = profile.feed_posts.map((post) => ({
        ...post,
        relationship: {
          ...post.relationship,
          following,
          subscribed: subscribed || undefined,
        },
      }));
    }
  } catch (error) {
    console.error("getProfileData: JSON overlay failed", error);
  }

  const specialRequestsAvailable = await resolveSpecialRequestsAvailable(slug);
  const specialRequestsEnabled =
    specialRequestsAvailable &&
    (await resolveSpecialRequestsEnabled(slug, profile.special_requests));

  return {
    ...profile,
    special_requests: specialRequestsAvailable || undefined,
    special_requests_enabled: specialRequestsEnabled,
    collection_enabled: collectionEnabled,
    is_own: isOwn || undefined,
    collection,
    popular_posts: isOwn ? [] : profile.popular_posts,
    feed_posts: feedPosts,
    relationship: {
      ...profile.relationship,
      subscribed,
      following,
    },
  };
}
