import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
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

function mapPostToFeedItem(post: {
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

function getFeedDataFromJson(): FeedData {
  const filePath = join(process.cwd(), "data", "my_feed.json");
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as FeedData;
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
      return getFeedDataFromJson();
    }

    const categories = Array.from(new Set(posts.map((post) => post.category)));
    const jsonMeta = getFeedDataFromJson();

    return {
      version: jsonMeta.version ?? "1.0",
      description: "INRCLIQ feed dataset (loaded from database)",
      generated_at: new Date().toISOString(),
      total_items: posts.length,
      categories: jsonMeta.categories?.length ? jsonMeta.categories : categories,
      items: posts.map(mapPostToFeedItem),
    };
  } catch (error) {
    console.error("getFeedData: falling back to JSON", error);
    return getFeedDataFromJson();
  }
}
