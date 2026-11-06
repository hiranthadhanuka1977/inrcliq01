import { randomBytes } from "node:crypto";
import { Prisma, type StudioAudience, type StudioAgeRating, type StudioFamily, type StudioMediaKind, type StudioProject, type StudioShape } from "../generated/prisma/client";
import { defaultCategory, mediaForShape, shapeById } from "./labels";
import { isStudioMediaUrl } from "./media";
import { prisma } from "./prisma";

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

type AudioTheme = {
  accent_a: string;
  accent_b: string;
  base: [string, string, string];
  border: string;
};

const AUDIO_THEMES: AudioTheme[] = [
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

function readAudioTheme(value: unknown): AudioTheme | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const theme = (value as { theme?: unknown }).theme;
  if (!theme || typeof theme !== "object" || Array.isArray(theme)) return undefined;
  const candidate = theme as AudioTheme;
  if (typeof candidate.accent_a !== "string" || !Array.isArray(candidate.base) || candidate.base.length !== 3) return undefined;
  return candidate;
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

function feedAudio(project: FeedSource, theme?: AudioTheme): Prisma.InputJsonValue | typeof Prisma.DbNull {
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
    theme: theme ?? randomAudioTheme(),
  };
}

function feedFields(project: FeedSource, theme?: AudioTheme) {
  const audio = project.mediaKind === "AUDIO";
  return {
    tags: audio ? [audioTag(project.family)] : [],
    mediaJson: audio ? Prisma.DbNull : (feedMedia(project) ?? Prisma.DbNull),
    audioJson: feedAudio(project, theme),
  };
}

async function createFeedPost(project: FeedSource, postedAt: Date) {
  const id = `c${randomBytes(12).toString("hex")}`;
  await prisma.feedPost.create({
    data: {
      id,
      category: project.category || "personal",
      text: [project.title, project.description].filter(Boolean).join("\n\n").slice(0, 2000),
      ...feedFields(project),
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

async function removeFeedPost(feedPostId: string | null, userId: string) {
  if (!feedPostId) return;
  await prisma.feedPost.deleteMany({ where: { id: feedPostId, userId } });
}

export async function releaseDueStudioProjects(userId?: string) {
  const due = await prisma.studioProject.findMany({
    where: {
      status: "SCHEDULED",
      publishAt: { lte: new Date() },
      ...(userId ? { userId } : {}),
    },
  });
  for (const project of due) {
    const publishedAt = project.publishAt ?? new Date();
    let feedPostId = project.feedPostId;
    if (project.pushToFeed && !feedPostId) feedPostId = await createFeedPost(project, publishedAt);
    await prisma.studioProject.update({
      where: { id: project.id },
      data: { status: "PUBLISHED", publishedAt, feedPostId },
    });
  }
}

export async function listAttachments(userId: string, creatorId: string) {
  const [products, catalog] = await Promise.all([
    prisma.collectionProduct.findMany({
      where: { published: true, collection: { creatorId } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 40,
    }),
    prisma.specialRequestCatalog.findUnique({ where: { userId }, select: { content: true } }),
  ]);
  const requests: { id: string; label: string }[] = [];
  const content = catalog?.content as { categories?: { services?: { id?: string; label?: string; published?: boolean }[] }[] } | null;
  for (const category of content?.categories ?? []) {
    for (const service of category.services ?? []) {
      if (service.published === false || !service.id || !service.label) continue;
      requests.push({ id: service.id, label: service.label });
    }
  }
  return { products, requests };
}

function fileKind(url: string): "VIDEO" | "AUDIO" | null {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  if (/\.(mp4|mov|webm)$/.test(path)) return "VIDEO";
  if (/\.(mp3|m4a|wav|aac)$/.test(path)) return "AUDIO";
  return null;
}

type SaveInput = {
  title: string;
  description: string;
  language: string;
  category: string;
  ageRating: StudioAgeRating;
  showId: string | null;
  parentProjectId: string | null;
  audience: StudioAudience;
  publishAt: Date | null;
  pushToFeed: boolean;
  commentsEnabled: boolean;
  attachmentType: "NONE" | "PRODUCT" | "REQUEST";
  attachmentId: string | null;
  rightsConfirmed: boolean;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  trimStartMs: number;
  trimEndMs: number | null;
  durationMs: number;
  intent: "save" | "publish" | "hide";
};

export async function saveProject(userId: string, creatorId: string, projectId: string, input: SaveInput) {
  const project = await prisma.studioProject.findFirst({ where: { id: projectId, userId } });
  if (!project) return { ok: false as const, error: "That project is not available." };

  if (input.intent === "hide") {
    await removeFeedPost(project.feedPostId, userId);
    await prisma.studioProject.update({
      where: { id: project.id },
      data: { status: "HIDDEN", feedPostId: null },
    });
    return { ok: true as const };
  }

  const spec = shapeById(project.shape);
  if (!spec) return { ok: false as const, error: "This project type is not available." };

  let parentKind: StudioMediaKind | null = null;
  let parentProjectId: string | null = null;
  if (spec.family === "PROMO") {
    parentProjectId = input.parentProjectId;
    const parent = parentProjectId
      ? await prisma.studioProject.findFirst({
          where: { id: parentProjectId, userId, family: { not: "PROMO" } },
          select: { mediaKind: true },
        })
      : null;
    if (!parent) return { ok: false as const, error: "Choose the piece this promo belongs to." };
    parentKind = parent.mediaKind;
  }

  let showId = spec.showKind ? input.showId : project.showId;
  if (spec.showKind) {
    if (!showId) return { ok: false as const, error: `Choose a ${spec.shelfNoun}.` };
    const show = await prisma.studioShow.findFirst({
      where: { id: showId, userId, kind: spec.showKind },
      select: { id: true },
    });
    if (!show) return { ok: false as const, error: `Choose a ${spec.shelfNoun} you already created.` };
    showId = show.id;
  }

  const mediaKind = mediaForShape(spec, parentKind);

  const publishing = input.intent === "publish" || project.status === "PUBLISHED" || project.status === "SCHEDULED";
  if (input.intent === "publish" || (input.intent === "save" && publishing)) {
    if (!input.title) return { ok: false as const, error: `Name this ${spec.pieceNoun}.` };
    if (!input.mediaUrl || !isStudioMediaUrl(input.mediaUrl)) return { ok: false as const, error: `Upload the ${spec.fileLabel.toLowerCase()}.` };
    const uploadedKind = fileKind(input.mediaUrl);
    if (uploadedKind && uploadedKind !== mediaKind) {
      return { ok: false as const, error: mediaKind === "AUDIO" ? "Upload an audio file for this piece." : "Upload a video file for this piece." };
    }
    if (mediaKind !== "AUDIO" && (!input.thumbnailUrl || !isStudioMediaUrl(input.thumbnailUrl))) {
      return { ok: false as const, error: "Choose a thumbnail." };
    }
    if (!input.rightsConfirmed) return { ok: false as const, error: "Confirm you have the rights to publish this." };
  }
  if (input.trimStartMs < 0 || input.trimStartMs > 86_400_000) {
    return { ok: false as const, error: "Set the trim inside the clip." };
  }
  if (input.trimEndMs != null && (input.trimEndMs <= input.trimStartMs || input.trimEndMs > 86_400_000)) {
    return { ok: false as const, error: "Move the trim end to after the start." };
  }
  if (input.attachmentType === "PRODUCT" && input.attachmentId) {
    const product = await prisma.collectionProduct.findFirst({
      where: { id: input.attachmentId, collection: { creatorId } },
      select: { id: true },
    });
    if (!product) return { ok: false as const, error: "That shop listing is not on your store." };
  }
  if (input.attachmentType === "REQUEST" && input.attachmentId) {
    const { requests } = await listAttachments(userId, creatorId);
    if (!requests.some((request) => request.id === input.attachmentId)) {
      return { ok: false as const, error: "That Special Request is not on your account." };
    }
  }

  const data = {
    title: input.title,
    description: input.description,
    language: input.language,
    category: input.category,
    ageRating: input.ageRating,
    showId,
    parentProjectId,
    audience: input.audience,
    publishAt: input.publishAt,
    pushToFeed: input.pushToFeed,
    commentsEnabled: input.commentsEnabled,
    attachmentType: input.attachmentType,
    attachmentId: input.attachmentType === "NONE" ? null : input.attachmentId,
    rightsConfirmed: input.rightsConfirmed,
    mediaUrl: input.mediaUrl,
    thumbnailUrl: input.thumbnailUrl,
    mediaKind: input.mediaUrl ? mediaKind : project.mediaKind,
    trimStartMs: input.trimStartMs,
    trimEndMs: input.trimEndMs,
    durationMs: input.durationMs > 0 ? input.durationMs : project.durationMs,
  };

  if (input.intent === "save" && (project.status === "DRAFT" || project.status === "HIDDEN")) {
    await prisma.studioProject.update({ where: { id: project.id }, data });
    return { ok: true as const };
  }
  if (input.intent === "save" && project.status === "SCHEDULED" && input.publishAt && input.publishAt.getTime() > Date.now()) {
    await prisma.studioProject.update({ where: { id: project.id }, data: { ...data, status: "SCHEDULED" } });
    return { ok: true as const };
  }

  const scheduled = input.intent === "publish" && input.publishAt && input.publishAt.getTime() > Date.now();
  const publishedAt = scheduled ? null : project.publishedAt ?? new Date();
  let feedPostId = project.feedPostId;
  const next = { ...project, ...data, audience: input.audience };

  if (!scheduled && input.pushToFeed) {
    if (feedPostId) {
      const existing = await prisma.feedPost.findFirst({
        where: { id: feedPostId, userId },
        select: { audioJson: true },
      });
      await prisma.feedPost.updateMany({
        where: { id: feedPostId, userId },
        data: {
          text: [input.title, input.description].filter(Boolean).join("\n\n").slice(0, 2000),
          category: input.category || "personal",
          membersOnly: input.audience === "MEMBERS",
          ...feedFields(next, readAudioTheme(existing?.audioJson)),
        },
      });
    } else {
      feedPostId = await createFeedPost(next, publishedAt ?? new Date());
    }
  } else if (feedPostId && (!input.pushToFeed || scheduled)) {
    await removeFeedPost(feedPostId, userId);
    feedPostId = null;
  }

  await prisma.studioProject.update({
    where: { id: project.id },
    data: {
      ...data,
      status: scheduled ? "SCHEDULED" : "PUBLISHED",
      publishedAt: scheduled ? null : publishedAt,
      feedPostId,
    },
  });
  return { ok: true as const };
}

export async function deleteProject(userId: string, projectId: string) {
  const project = await prisma.studioProject.findFirst({ where: { id: projectId, userId } });
  if (!project) return;
  await removeFeedPost(project.feedPostId, userId);
  await prisma.studioProject.delete({ where: { id: project.id } });
}

export async function createGuidedProject(input: {
  userId: string;
  creatorId: string;
  family: StudioFamily;
  shape: StudioShape;
  title: string;
  showId: string | null;
  parentProjectId: string | null;
  parentKind: StudioMediaKind | null;
}) {
  const spec = shapeById(input.shape);
  return prisma.studioProject.create({
    data: {
      userId: input.userId,
      creatorId: input.creatorId,
      family: input.family,
      shape: input.shape,
      title: input.title,
      showId: input.showId,
      parentProjectId: input.parentProjectId,
      mediaKind: spec ? mediaForShape(spec, input.parentKind) : null,
      category: spec ? defaultCategory(spec) : "entertainment",
    },
    select: { id: true },
  });
}
