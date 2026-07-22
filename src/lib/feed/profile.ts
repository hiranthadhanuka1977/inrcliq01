import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getCreatorCollection } from "@/lib/feed/collection";
import {
  getSubscriptionForUser,
} from "@/lib/feed/subscription-service";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import type { FeedAudio, FeedAuthor, FeedItem, FeedMedia } from "@/types/feed/feed";
import type { ProfileCollectionItem, ProfileData } from "@/types/feed/profile";

const PROFILE_FILES: Record<string, string> = {
  "mia-chen": "mia-chen.json",
  "dev-weekly": "dev-weekly.json",
  hiran: "hiran.json",
  "planet-unfolded": "planet-unfolded.json",
  "good-guy-podcast": "good-guy-podcast.json",
  "bathiya-santhush": "bathiya-santhush.json",
};

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

function mapDbPostToFeedItem(post: {
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
    avatarInitials: string;
    avatarColor: string;
    avatarUrl: string | null;
    verified: boolean;
  };
}): FeedItem {
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
      following: post.following,
    },
    posted_at: post.postedAt.toISOString(),
    posted_ago: post.postedAgo ?? "",
    members_only: post.membersOnly || undefined,
  };
}

async function getCreatorFeedPosts(
  slug: string,
  preferredIds: string[],
): Promise<FeedItem[] | null> {
  if (preferredIds.length === 0) return null;

  const posts = await prisma.feedPost.findMany({
    where: {
      creator: { slug },
      id: { in: preferredIds },
    },
    include: { creator: true },
  });

  if (posts.length === 0) return null;

  const byId = new Map(posts.map((post) => [post.id, post]));
  return preferredIds
    .map((id) => {
      const post = byId.get(id);
      return post ? mapDbPostToFeedItem(post) : null;
    })
    .filter((post): post is FeedItem => post !== null);
}

/** Profile JSON base + collection/feed/subscription overlays from DB when available. */
export async function getProfileData(slug: string): Promise<ProfileData | null> {
  const profile = getProfileDataFromJson(slug);
  if (!profile) return null;

  let collection = profile.collection;
  let feedPosts = profile.feed_posts;
  let subscribed = Boolean(profile.relationship?.subscribed);

  try {
    const preferredIds = profile.feed_posts.map((post) => post.id);
    const [dbCollection, dbFeed, sessionUser, creator] = await Promise.all([
      getCreatorCollection(slug),
      getCreatorFeedPosts(slug, preferredIds),
      getSessionUser(),
      prisma.creatorUser.findFirst({ where: { slug }, select: { id: true } }),
    ]);

    if (dbCollection?.products?.length) {
      collection = mapCollectionPreview(dbCollection.products);
    }
    if (dbFeed?.length) {
      const fromDbIds = new Set(dbFeed.map((post) => post.id));
      const leftovers = profile.feed_posts.filter((post) => !fromDbIds.has(post.id));
      feedPosts = [...dbFeed, ...leftovers];
    }

    if (sessionUser && creator) {
      const subscription = await getSubscriptionForUser(sessionUser.id, creator.id);
      subscribed = subscription?.status === "ACTIVE";
    } else if (!sessionUser) {
      subscribed = false;
    }
  } catch (error) {
    console.error("getProfileData: DB overlay failed", error);
  }

  return {
    ...profile,
    collection,
    feed_posts: feedPosts,
    relationship: {
      ...profile.relationship,
      subscribed,
    },
  };
}
