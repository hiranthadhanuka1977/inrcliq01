import { randomBytes } from "node:crypto";
import { Prisma, type AgeZone, type StudioAgeRating, type StudioAudience, type StudioFamily, type StudioProject } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const VIEWER_RANK: Record<AgeZone, number> = {
  KIDS: 0,
  TEENS: 1,
  MATURE_TEENS: 2,
  ADULT: 3,
};

const RATING_RANK: Record<StudioAgeRating, number> = {
  ALL: 0,
  TEENS: 1,
  MATURE: 2,
  ADULT: 3,
};

export function viewerCanSeeRating(zone: AgeZone | null | undefined, rating: StudioAgeRating) {
  const viewer = zone ? VIEWER_RANK[zone] : 0;
  return viewer >= RATING_RANK[rating];
}

export function isStudioMediaUrl(url: string) {
  if (url.startsWith("/uploads/studio/")) return true;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      (parsed.hostname.endsWith(".public.blob.vercel-storage.com") ||
        parsed.hostname.endsWith(".blob.vercel-storage.com"))
    );
  } catch {
    return false;
  }
}

type FeedSource = Pick<
  StudioProject,
  | "title"
  | "description"
  | "category"
  | "audience"
  | "mediaUrl"
  | "mediaKind"
  | "thumbnailUrl"
  | "creatorId"
  | "userId"
  | "family"
  | "durationMs"
  | "trimStartMs"
  | "trimEndMs"
>;

function clock(seconds: number) {
  const rounded = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remain = rounded % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(remain).padStart(2, "0")}`;
  return `${minutes}:${String(remain).padStart(2, "0")}`;
}

function audioTag(family: StudioFamily) {
  if (family === "PODCAST") return "Podcast";
  if (family === "AUDIOBOOK") return "Audiobook";
  if (family === "MUSIC") return "Music";
  return "Audio";
}

const AUDIO_THEMES = [
  { accent_a: "120, 220, 160", accent_b: "72, 168, 118", base: ["#2a4534", "#223a2b", "#1a2e22"], border: "120, 200, 150" },
  { accent_a: "120, 176, 255", accent_b: "70, 120, 210", base: ["#1d3358", "#182a48", "#121e34"], border: "130, 176, 240" },
  { accent_a: "186, 150, 255", accent_b: "130, 96, 210", base: ["#35284f", "#2a2040", "#1d1730"], border: "176, 150, 230" },
  { accent_a: "255, 196, 110", accent_b: "210, 140, 60", base: ["#4a3820", "#3a2c18", "#2a2012"], border: "230, 180, 110" },
  { accent_a: "255, 150, 170", accent_b: "200, 90, 120", base: ["#4a2430", "#3a1c28", "#28141c"], border: "230, 140, 160" },
  { accent_a: "110, 220, 210", accent_b: "60, 160, 160", base: ["#1c3e3c", "#163230", "#102624"], border: "120, 200, 190" },
  { accent_a: "150, 170, 230", accent_b: "90, 110, 180", base: ["#243044", "#1c2638", "#141c2a"], border: "150, 170, 210" },
];

function randomAudioTheme() {
  return AUDIO_THEMES[Math.floor(Math.random() * AUDIO_THEMES.length)];
}

function feedMedia(project: FeedSource): Prisma.InputJsonValue | undefined {
  const cover =
    project.thumbnailUrl && isStudioMediaUrl(project.thumbnailUrl)
      ? [{ url: project.thumbnailUrl, alt: project.title || "Cover" }]
      : [];
  if (project.mediaKind === "VIDEO" && project.mediaUrl && isStudioMediaUrl(project.mediaUrl)) {
    return {
      type: "video",
      images: cover,
      video_url: project.mediaUrl,
      use_sample_video: false,
      items: [
        {
          type: "video",
          url: project.mediaUrl,
          alt: project.title || "Video",
          poster: cover[0]?.url ?? null,
        },
      ],
    };
  }
  if (project.mediaKind === "AUDIO" || !cover.length) return undefined;
  return { type: "image", images: cover, video_url: null, use_sample_video: false };
}

function feedAudio(project: FeedSource): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (project.mediaKind !== "AUDIO" || !project.mediaUrl || !isStudioMediaUrl(project.mediaUrl)) return Prisma.DbNull;
  const start = Math.max(0, project.trimStartMs) / 1000;
  const fileSeconds = Math.max(0, project.durationMs) / 1000;
  const end = project.trimEndMs != null ? project.trimEndMs / 1000 : fileSeconds;
  const playable = end > start ? end - start : fileSeconds;
  const cover = project.thumbnailUrl && isStudioMediaUrl(project.thumbnailUrl) ? project.thumbnailUrl : "";
  return {
    title: project.title || "Audio",
    thumbnail: { url: cover, alt: project.title || "Cover" },
    current_time: "0:00",
    duration: clock(playable),
    progress: 0,
    audio_url: project.mediaUrl,
    trim_start: start,
    ...(project.trimEndMs != null ? { trim_end: project.trimEndMs / 1000 } : {}),
    theme: randomAudioTheme(),
  };
}

export async function createStudioFeedPost(project: FeedSource, postedAt: Date) {
  const id = `c${randomBytes(12).toString("hex")}`;
  const text = [project.title, project.description].filter(Boolean).join("\n\n").slice(0, 2000);
  await prisma.feedPost.create({
    data: {
      id,
      category: project.category || "personal",
      text,
      tags: project.mediaKind === "AUDIO" ? [audioTag(project.family)] : [],
      mediaJson: project.mediaKind === "AUDIO" ? Prisma.DbNull : (feedMedia(project) ?? Prisma.DbNull),
      audioJson: feedAudio(project),
      likes: 0,
      comments: 0,
      shares: 0,
      following: false,
      membersOnly: project.audience === "MEMBERS",
      postedAt,
      postedAgo: "Just now",
      sortOrder: 0,
      creatorId: project.creatorId,
      userId: project.userId,
    },
  });
  return id;
}

export async function removeStudioFeedPost(feedPostId: string | null, userId: string) {
  if (!feedPostId) return;
  await prisma.feedPost.deleteMany({ where: { id: feedPostId, userId } });
}

/** Turns scheduled projects into published ones once their time has arrived. */
export async function releaseDueStudioProjects() {
  const due = await prisma.studioProject.findMany({
    where: { status: "SCHEDULED", publishAt: { lte: new Date() } },
  });
  for (const project of due) {
    const publishedAt = project.publishAt ?? new Date();
    let feedPostId = project.feedPostId;
    if (project.pushToFeed && !feedPostId) {
      feedPostId = await createStudioFeedPost(project, publishedAt);
    }
    await prisma.studioProject.update({
      where: { id: project.id },
      data: { status: "PUBLISHED", publishedAt, feedPostId },
    });
  }
}

export async function viewerCanWatch(
  viewerId: string,
  project: { userId: string; creatorId: string; audience: StudioAudience; ageRating: StudioAgeRating },
  viewerZone: AgeZone | null | undefined,
) {
  if (project.userId === viewerId) return true;
  if (!viewerCanSeeRating(viewerZone, project.ageRating)) return false;
  if (project.audience === "PUBLIC" || project.audience === "UNLISTED") return true;
  if (project.audience === "FOLLOWERS") {
    const follow = await prisma.creatorFollow.findUnique({
      where: { userId_creatorId: { userId: viewerId, creatorId: project.creatorId } },
      select: { id: true },
    });
    return Boolean(follow);
  }
  const subscription = await prisma.creatorSubscription.findUnique({
    where: { userId_creatorId: { userId: viewerId, creatorId: project.creatorId } },
    select: { status: true },
  });
  return subscription?.status === "ACTIVE";
}

const SHAPE_LABEL: Record<string, string> = {
  SHORT_VIDEO: "Short",
  SHORT_AUDIO: "Audio short",
  FILM: "Film",
  SERIES_EPISODE: "Episode",
  TALK: "Talk",
  LESSON: "Lesson",
  PERFORMANCE: "Performance",
  MUSIC_VIDEO: "Music video",
  PODCAST_SINGLE: "Podcast",
  PODCAST_EPISODE: "Podcast episode",
  BOOK: "Audiobook",
  BOOK_IN_SERIES: "Audiobook",
  SINGLE: "Single",
  EP_TRACK: "Track",
  ALBUM_TRACK: "Track",
  MEDITATION: "Meditation",
  SLEEP: "Sleep",
  ASMR: "ASMR",
  SOUNDSCAPE: "Soundscape",
  TRAILER: "Trailer",
  CLIP: "Clip",
  SAMPLE: "Sample",
  HIGHLIGHT: "Highlight",
};

export function studioShapeLabel(shape: string) {
  return SHAPE_LABEL[shape] ?? "Video";
}

const projectCardSelect = {
  id: true,
  title: true,
  shape: true,
  audience: true,
  ageRating: true,
  thumbnailUrl: true,
  mediaKind: true,
  publishedAt: true,
  userId: true,
  creatorId: true,
  show: { select: { title: true } },
  creator: { select: { name: true, slug: true } },
} as const;

export async function listVideoLibrary(viewerId: string, viewerZone: AgeZone | null | undefined) {
  await releaseDueStudioProjects();
  const projects = await prisma.studioProject.findMany({
    where: { status: "PUBLISHED", audience: { in: ["PUBLIC", "FOLLOWERS", "MEMBERS"] } },
    orderBy: { publishedAt: "desc" },
    take: 60,
    select: projectCardSelect,
  });
  const visible = [];
  for (const project of projects) {
    if (await viewerCanWatch(viewerId, project, viewerZone)) visible.push(project);
  }
  return visible;
}

export async function getStudioWatch(id: string, viewerId: string, viewerZone: AgeZone | null | undefined) {
  await releaseDueStudioProjects();
  const project = await prisma.studioProject.findUnique({
    where: { id },
    include: {
      creator: { select: { name: true, slug: true, handle: true } },
      show: { select: { title: true } },
      parent: { select: { id: true, title: true, status: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        take: 80,
        include: { user: { select: { firstName: true, handle: true } } },
      },
    },
  });
  if (!project) return { kind: "missing" as const };
  const owner = project.userId === viewerId;
  if (!owner && project.status !== "PUBLISHED") return { kind: "missing" as const };
  const allowed = await viewerCanWatch(viewerId, project, viewerZone);
  if (!allowed) return { kind: "locked" as const, project };
  return { kind: "open" as const, project, owner };
}
