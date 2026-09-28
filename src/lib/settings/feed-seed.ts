import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * The seed sample is every post in data/my_feed.json plus the feed_posts of each
 * data/<profile>.json. Delete removes exactly those post IDs, and restore inserts
 * the ones that are missing, so member posts are never touched.
 */

const FEED_FILE = "my_feed.json";
const ORDER_FILE = "feed-seed-order.json";

type SeedItem = {
  id?: string | number;
  category?: string;
  text?: string;
  tags?: unknown;
  media?: unknown;
  audio?: unknown;
  engagement?: { likes?: number; comments?: number; shares?: number };
  relationship?: { following?: boolean };
  members_only?: boolean;
  posted_at?: string;
  posted_ago?: string;
  author?: { handle?: string };
};

type SeedPost = {
  id: string;
  item: SeedItem;
  file: string;
  profileSlug: string | null;
  profileHandle: string | null;
};

export type FeedSeedStatus = {
  seedPosts: number;
  inFeed: number;
  missing: number;
};

export type FeedSeedRestoreResult = {
  restored: number;
  alreadyInFeed: number;
  skippedNoCreator: string[];
  pinsRestored: number;
};

function dataPath(file: string) {
  return join(process.cwd(), "data", file);
}

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(dataPath(file), "utf8"));
}

function bareHandle(handle: string | null | undefined) {
  return String(handle ?? "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
}

function loadSeedPosts(): SeedPost[] {
  const posts: SeedPost[] = [];
  const seen = new Set<string>();

  function add(item: SeedItem, file: string, profileSlug: string | null, profileHandle: string | null) {
    const id = String(item?.id ?? "").trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    posts.push({ id, item, file, profileSlug, profileHandle });
  }

  const feed = readJson(FEED_FILE) as { items?: SeedItem[] };
  for (const item of Array.isArray(feed.items) ? feed.items : []) add(item, FEED_FILE, null, null);

  for (const file of readdirSync(join(process.cwd(), "data"))) {
    if (!file.endsWith(".json") || file === FEED_FILE || file === ORDER_FILE || file.includes("collection")) {
      continue;
    }
    let profile: { slug?: string; handle?: string; feed_posts?: SeedItem[] };
    try {
      profile = readJson(file) as typeof profile;
    } catch {
      continue;
    }
    if (!profile?.slug || !Array.isArray(profile.feed_posts)) continue;
    for (const item of profile.feed_posts) {
      add(item, file, profile.slug.toLowerCase(), profile.handle ?? null);
    }
  }

  return posts;
}

/** Feed order the seed posts had when the snapshot was taken, keyed by post ID. */
function loadSeedSortOrder(): Record<string, number> {
  try {
    const parsed = readJson(ORDER_FILE) as { sortOrder?: Record<string, number> };
    return parsed.sortOrder ?? {};
  } catch {
    return {};
  }
}

async function findExistingIds(ids: string[]) {
  const rows = await prisma.feedPost.findMany({ where: { id: { in: ids } }, select: { id: true } });
  return new Set(rows.map((row) => row.id));
}

export async function getFeedSeedStatus(): Promise<FeedSeedStatus> {
  const ids = loadSeedPosts().map((post) => post.id);
  const inFeed = ids.length ? await prisma.feedPost.count({ where: { id: { in: ids } } }) : 0;
  return { seedPosts: ids.length, inFeed, missing: ids.length - inFeed };
}

export async function deleteFeedSeedSample(): Promise<{ deleted: number }> {
  const ids = loadSeedPosts().map((post) => post.id);
  if (!ids.length) return { deleted: 0 };

  const [, result] = await prisma.$transaction([
    prisma.feedHiddenPost.deleteMany({ where: { postId: { in: ids } } }),
    prisma.feedPost.deleteMany({ where: { id: { in: ids } } }),
  ]);
  return { deleted: result.count };
}

function toPostedAt(value: string | undefined) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export async function restoreFeedSeedSample(): Promise<FeedSeedRestoreResult> {
  const seedPosts = loadSeedPosts();
  if (!seedPosts.length) return { restored: 0, alreadyInFeed: 0, skippedNoCreator: [], pinsRestored: 0 };

  const [existingIds, creators, maxSort] = await Promise.all([
    findExistingIds(seedPosts.map((post) => post.id)),
    prisma.creatorUser.findMany({ select: { id: true, handle: true, slug: true, userId: true } }),
    prisma.feedPost.aggregate({ _max: { sortOrder: true } }),
  ]);
  const creatorBySlug = new Map(
    creators.filter((creator) => creator.slug).map((creator) => [creator.slug!.toLowerCase(), creator]),
  );
  const creatorByHandle = new Map(creators.map((creator) => [bareHandle(creator.handle), creator]));
  const seedSortOrder = loadSeedSortOrder();
  let nextSortOrder = maxSort._max.sortOrder ?? 0;

  const rows: Prisma.FeedPostCreateManyInput[] = [];
  const skippedNoCreator: string[] = [];
  const restoredBySlug = new Map<string, string[]>();

  for (const { id, item, file, profileSlug, profileHandle } of seedPosts) {
    if (existingIds.has(id)) continue;

    const creator =
      (profileSlug ? creatorBySlug.get(profileSlug) : undefined) ??
      creatorByHandle.get(bareHandle(profileHandle)) ??
      creatorByHandle.get(bareHandle(item.author?.handle));
    if (!creator) {
      skippedNoCreator.push(`${id} (${file})`);
      continue;
    }

    rows.push({
      id,
      category: item.category || "personal",
      text: item.text || "",
      tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
      mediaJson: (item.media ?? undefined) as Prisma.InputJsonValue | undefined,
      audioJson: (item.audio ?? undefined) as Prisma.InputJsonValue | undefined,
      likes: Number(item.engagement?.likes || 0),
      comments: Number(item.engagement?.comments || 0),
      shares: Number(item.engagement?.shares || 0),
      following: Boolean(item.relationship?.following),
      membersOnly: Boolean(item.members_only),
      postedAt: toPostedAt(item.posted_at),
      postedAgo: item.posted_ago ?? null,
      sortOrder: seedSortOrder[id] ?? ++nextSortOrder,
      creatorId: creator.id,
      userId: creator.userId,
    });

    if (profileSlug) {
      restoredBySlug.set(profileSlug, [...(restoredBySlug.get(profileSlug) ?? []), id]);
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const created = rows.length ? await tx.feedPost.createMany({ data: rows, skipDuplicates: true }) : { count: 0 };

    let pinsRestored = 0;
    for (const [slug, ids] of restoredBySlug) {
      const profile = await tx.userProfile.findFirst({
        where: { slug: { equals: slug, mode: "insensitive" } },
        select: { userId: true, pinnedFeedPostIds: true },
      });
      if (!profile) continue;
      const missingPins = ids.filter((id) => !profile.pinnedFeedPostIds.includes(id));
      if (!missingPins.length) continue;
      await tx.userProfile.update({
        where: { userId: profile.userId },
        data: { pinnedFeedPostIds: [...profile.pinnedFeedPostIds, ...missingPins] },
      });
      pinsRestored += missingPins.length;
    }

    return { restored: created.count, pinsRestored };
  });

  return {
    restored: result.restored,
    alreadyInFeed: existingIds.size,
    skippedNoCreator,
    pinsRestored: result.pinsRestored,
  };
}
