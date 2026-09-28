import { prisma } from "@/lib/prisma";
import { isPlayableVideoMedia, SAMPLE_FEED_VIDEO_URL } from "@/lib/feed/sample-video";
import { SEEDED_CREATOR_SOURCES } from "@/lib/settings/feed-dashboard";
import { formatUserName } from "@/lib/settings/users";
import type { FeedAudio, FeedMedia } from "@/types/feed/feed";

export type SettingsFeedPostRow = {
  position: number;
  id: string;
  category: string;
  text: string;
  tags: string[];
  kind: "audio" | "image" | "collage" | "video" | "text";
  membersOnly: boolean;
  seeded: boolean;
  likes: number;
  comments: number;
  shares: number;
  following: boolean;
  sortOrder: number;
  postedAt: string;
  postedAgo: string | null;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    name: string;
    handle: string;
    slug: string | null;
    source: string;
    verified: boolean;
  };
  authorUser: { id: string; name: string; email: string } | null;
  media: FeedMedia | null;
  audio: FeedAudio | null;
  /** Clip the feed plays for this post: its own `video_url` or the shared sample. */
  video: { url: string; isSample: boolean } | null;
};

function resolveVideo(media: FeedMedia | null): SettingsFeedPostRow["video"] {
  if (!media) return null;
  if (media.video_url) return { url: media.video_url, isSample: false };
  return isPlayableVideoMedia(media) ? { url: SAMPLE_FEED_VIDEO_URL, isSample: true } : null;
}

/** Every feed post, in home feed order, with all stored properties. */
export async function listSettingsFeedPosts(): Promise<SettingsFeedPostRow[]> {
  const posts = await prisma.feedPost.findMany({
    orderBy: [{ sortOrder: "asc" }, { postedAt: "desc" }],
    include: {
      creator: {
        select: { id: true, name: true, handle: true, slug: true, source: true, verified: true },
      },
      authorUser: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });

  return posts.map((post, index) => {
    const media = (post.mediaJson as FeedMedia | null) ?? null;
    const audio = (post.audioJson as FeedAudio | null) ?? null;

    return {
      position: index + 1,
      id: post.id,
      category: post.category,
      text: post.text,
      tags: post.tags,
      kind: audio ? "audio" : (media?.type ?? "text"),
      membersOnly: post.membersOnly,
      seeded: SEEDED_CREATOR_SOURCES.includes(post.creator.source),
      likes: post.likes,
      comments: post.comments,
      shares: post.shares,
      following: post.following,
      sortOrder: post.sortOrder,
      postedAt: post.postedAt.toISOString(),
      postedAgo: post.postedAgo,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      creator: post.creator,
      authorUser: post.authorUser
        ? {
            id: post.authorUser.id,
            email: post.authorUser.email,
            name: formatUserName(post.authorUser.firstName, post.authorUser.lastName),
          }
        : null,
      media,
      audio,
      video: resolveVideo(media),
    };
  });
}
