import { Prisma, type AgeZone } from "@/generated/prisma/client";
import { getFollowedCreatorIdsForUser } from "@/lib/feed/follow-service";
import { getHiddenPostIdsForUser } from "@/lib/feed/post-actions";
import {
  formatDurationLabel,
  formatPostedAgo,
  postVideoTitle,
  videosFromPostMedia,
} from "@/lib/feed/post-videos";
import { resolveAuthorProfileSlug } from "@/lib/feed/profile-slugs";
import { prisma } from "@/lib/prisma";
import { FEED_CATEGORIES } from "@/lib/feed/feed";
import { isStudioMediaUrl, releaseDueStudioProjects, studioShapeLabel, viewerCanSeeRating } from "@/lib/studio/library";
import { isStoredUploadUrl } from "@/lib/uploads/store-upload";

export type VideoShelfItem = {
  key: string;
  href: string;
  title: string;
  thumbnailUrl: string | null;
  /** Used when the video has no saved thumbnail, so the card can show a frame. */
  previewUrl: string | null;
  previewSeconds: number;
  durationLabel: string | null;
  authorName: string;
  authorSlug: string | null;
  avatarUrl: string | null;
  avatarInitials: string;
  avatarColor: string;
  subtitle: string;
  membersOnly: boolean;
  likes: number;
  category: string;
  postedAtMs: number;
  description: string;
  caption: string | null;
  playback: {
    src: string;
    poster: string | null;
    startMs: number;
    endMs: number | null;
  } | null;
};

export type VideoShelf = {
  videos: VideoShelfItem[];
};

function likesLabel(likes: number) {
  if (likes <= 0) return null;
  return `${likes.toLocaleString("en-US")} ${likes === 1 ? "like" : "likes"}`;
}

function joinMeta(parts: Array<string | null>) {
  return parts.filter(Boolean).join(" · ");
}

function authorSlug(handle: string, slug: string | null | undefined) {
  const resolved = resolveAuthorProfileSlug(handle, slug);
  return resolved || null;
}

function canSeeMembersPost(
  post: { userId: string | null; creatorId: string; membersOnly: boolean; creator: { userId: string | null } },
  viewerId: string,
  ownCreatorId: string | null,
  subscribed: Set<string>,
) {
  if (!post.membersOnly) return true;
  if (post.userId === viewerId || post.creator.userId === viewerId) return true;
  if (ownCreatorId && post.creatorId === ownCreatorId) return true;
  return subscribed.has(post.creatorId);
}

function canWatchStudio(
  project: { userId: string; creatorId: string; audience: string; ageRating: Parameters<typeof viewerCanSeeRating>[1] },
  viewerId: string,
  viewerZone: AgeZone | null | undefined,
  followed: Set<string>,
  subscribed: Set<string>,
) {
  if (project.userId === viewerId) return true;
  if (!viewerCanSeeRating(viewerZone, project.ageRating)) return false;
  if (project.audience === "PUBLIC" || project.audience === "UNLISTED") return true;
  if (project.audience === "FOLLOWERS") return followed.has(project.creatorId);
  return subscribed.has(project.creatorId);
}

function studioSeconds(project: { durationMs: number; trimStartMs: number; trimEndMs: number | null }) {
  const start = Math.max(0, project.trimStartMs) / 1000;
  const fileEnd = project.durationMs > 0 ? project.durationMs / 1000 : null;
  const end = project.trimEndMs != null ? project.trimEndMs / 1000 : fileEnd;
  if (end == null || end <= start) return null;
  return end - start;
}

/** Published videos from posts and Creator Studio, newest first, for the Videos page. */
export async function loadVideoShelf(viewerId: string, viewerZone: AgeZone | null | undefined): Promise<VideoShelf> {
  await releaseDueStudioProjects();

  const [posts, hiddenIds, subscriptionRows, ownCreator, followed, projects] = await Promise.all([
    prisma.feedPost.findMany({
      where: { NOT: { mediaJson: { equals: Prisma.DbNull } } },
      orderBy: { postedAt: "desc" },
      select: {
        id: true,
        category: true,
        text: true,
        mediaJson: true,
        likes: true,
        membersOnly: true,
        postedAt: true,
        userId: true,
        creatorId: true,
        creator: {
          select: {
            name: true,
            handle: true,
            slug: true,
            avatarInitials: true,
            avatarColor: true,
            avatarUrl: true,
            userId: true,
          },
        },
      },
    }),
    getHiddenPostIdsForUser(viewerId),
    prisma.creatorSubscription.findMany({
      where: { userId: viewerId, status: "ACTIVE" },
      select: { creatorId: true },
    }),
    prisma.creatorUser.findFirst({
      where: { userId: viewerId },
      select: { id: true },
    }),
    getFollowedCreatorIdsForUser(viewerId),
    prisma.studioProject.findMany({
      where: {
        status: "PUBLISHED",
        mediaKind: "VIDEO",
        audience: { in: ["PUBLIC", "FOLLOWERS", "MEMBERS"] },
      },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        shape: true,
        audience: true,
        ageRating: true,
        thumbnailUrl: true,
        mediaUrl: true,
        mediaKind: true,
        durationMs: true,
        trimStartMs: true,
        trimEndMs: true,
        publishedAt: true,
        createdAt: true,
        feedPostId: true,
        userId: true,
        creatorId: true,
        show: { select: { title: true } },
        creator: {
          select: {
            name: true,
            handle: true,
            slug: true,
            avatarInitials: true,
            avatarColor: true,
            avatarUrl: true,
          },
        },
      },
    }),
  ]);

  const subscribed = new Set(subscriptionRows.map((row) => row.creatorId));
  const ownCreatorId = ownCreator?.id ?? null;
  const visibleProjects = projects.filter((project) =>
    canWatchStudio(project, viewerId, viewerZone, followed, subscribed),
  );
  const studioVideoPostIds = new Set(
    visibleProjects
      .filter((project) => project.mediaKind === "VIDEO" && project.mediaUrl && isStudioMediaUrl(project.mediaUrl))
      .map((project) => project.feedPostId)
      .filter((id): id is string => Boolean(id)),
  );

  const videos: VideoShelfItem[] = [];

  for (const post of posts) {
    if (hiddenIds.has(post.id) || studioVideoPostIds.has(post.id)) continue;
    if (!canSeeMembersPost(post, viewerId, ownCreatorId, subscribed)) continue;
    const extracted = videosFromPostMedia(post.mediaJson);
    extracted.forEach((video, ordinal) => {
      const length = video.trim ? video.trim.end - video.trim.start : null;
      videos.push({
        key: `post:${post.id}:${video.itemIndex}`,
        href: `/feed/videos/post/${encodeURIComponent(post.id)}/${video.itemIndex}`,
        title: postVideoTitle(post.text, video, extracted.length, ordinal),
        thumbnailUrl: video.poster,
        previewUrl: video.url,
        previewSeconds: video.trim ? Math.max(0.1, video.trim.start) : 0.1,
        durationLabel: length != null ? formatDurationLabel(length) : null,
        authorName: post.creator.name,
        authorSlug: authorSlug(post.creator.handle, post.creator.slug),
        avatarUrl: post.creator.avatarUrl,
        avatarInitials: post.creator.avatarInitials || post.creator.name.slice(0, 2).toUpperCase(),
        avatarColor: post.creator.avatarColor || "#5b6cd8",
        subtitle: joinMeta([formatPostedAgo(post.postedAt), likesLabel(post.likes)]),
        membersOnly: post.membersOnly,
        likes: post.likes,
        category: post.category,
        postedAtMs: post.postedAt.getTime(),
        description: post.text,
        caption: video.caption,
        playback: {
          src: video.url,
          poster: video.poster,
          startMs: video.trim ? Math.round(video.trim.start * 1000) : 0,
          endMs: video.trim ? Math.round(video.trim.end * 1000) : null,
        },
      });
    });
  }

  for (const project of visibleProjects) {
    const when = project.publishedAt ?? project.createdAt;
    const playable = project.mediaUrl && isStudioMediaUrl(project.mediaUrl) ? project.mediaUrl : null;
    const thumb =
      project.thumbnailUrl && (isStudioMediaUrl(project.thumbnailUrl) || isStoredUploadUrl(project.thumbnailUrl))
        ? project.thumbnailUrl
        : null;
    const seconds = studioSeconds(project);
    const shared = {
      href: `/feed/videos/${project.id}`,
      title: project.title || "Untitled",
      thumbnailUrl: thumb,
      authorName: project.creator.name,
      authorSlug: authorSlug(project.creator.handle, project.creator.slug),
      avatarUrl: project.creator.avatarUrl,
      avatarInitials: project.creator.avatarInitials || project.creator.name.slice(0, 2).toUpperCase(),
      avatarColor: project.creator.avatarColor || "#5b6cd8",
      membersOnly: project.audience === "MEMBERS",
      likes: 0,
      category: project.category,
      postedAtMs: when.getTime(),
      description: project.description,
      caption: null,
      playback: null,
      subtitle: joinMeta([
        studioShapeLabel(project.shape),
        project.show?.title ?? null,
        formatPostedAgo(when),
      ]),
    };

    if (!playable) continue;
    videos.push({
      ...shared,
      key: `studio:${project.id}`,
      previewUrl: playable,
      previewSeconds: Math.max(0.1, project.trimStartMs / 1000),
      durationLabel: seconds != null ? formatDurationLabel(seconds) : null,
    });
  }

  videos.sort((a, b) => b.postedAtMs - a.postedAtMs);
  return { videos };
}

/** Categories that have something on the shelf, in the same order as the home feed. */
export function videoShelfCategories(shelf: VideoShelf) {
  const present = new Set(
    shelf.videos.map((item) => item.category).filter((category) => category.trim()),
  );
  const ordered = FEED_CATEGORIES.filter((category) => present.has(category));
  for (const category of present) {
    if (!ordered.includes(category)) ordered.push(category);
  }
  return ordered;
}

export function videoCategoryLabel(category: string) {
  if (category === "discovery") return "Discovery";
  return category.charAt(0).toUpperCase() + category.slice(1);
}
