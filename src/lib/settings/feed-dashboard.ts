import { prisma } from "@/lib/prisma";
import { buildDailyCounts, trendWindowStart, type SummarySegment } from "@/lib/settings/dashboard";

/** CreatorUser sources for demo content imported from JSON rather than posted by members. */
export const SEEDED_CREATOR_SOURCES = ["feed-json", "profile-json"];
const DAY_MS = 86_400_000;

const MEDIA_KIND_LABELS: Record<string, string> = {
  text: "Text only",
  image: "Single photo",
  collage: "Photo collage",
  video: "Video",
  audio: "Audio",
};

export type FeedTopCreator = {
  id: string;
  name: string;
  handle: string;
  slug: string | null;
  posts: number;
  seeded: boolean;
};

export type FeedRecentPost = {
  id: string;
  excerpt: string;
  authorName: string;
  authorHandle: string;
  category: string;
  kind: string;
  membersOnly: boolean;
  postedAt: Date;
};

export type SettingsFeedSummary = {
  totalPosts: number;
  memberPosts: number;
  seededPosts: number;
  postsLast7Days: number;
  postsLast30Days: number;
  creatorsWithPosts: number;
  membersOnlyPosts: number;
  hiddenByViewers: number;
  engagement: { likes: number; comments: number; shares: number };
  follows: number;
  activeSubscriptions: number;
  categories: SummarySegment[];
  mediaKinds: SummarySegment[];
  dailyPosts: { date: string; label: string; count: number }[];
  topCreators: FeedTopCreator[];
  recentMemberPosts: FeedRecentPost[];
};

function titleCase(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Uncategorised";
}

function postKind(post: { mediaJson: unknown; audioJson: unknown }) {
  if (post.audioJson) return "audio";
  const type = (post.mediaJson as { type?: unknown } | null)?.type;
  return typeof type === "string" && type ? type : "text";
}

function excerpt(text: string, max = 90) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "(no text)";
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export async function getSettingsFeedSummary(): Promise<SettingsFeedSummary> {
  const now = Date.now();
  const trendStart = trendWindowStart();
  const seededWhere = { creator: { source: { in: SEEDED_CREATOR_SOURCES } } };

  const [
    totalPosts,
    seededPosts,
    postsLast7Days,
    postsLast30Days,
    membersOnlyPosts,
    hiddenByViewers,
    engagement,
    follows,
    activeSubscriptions,
    categoryRows,
    kindRows,
    creatorRows,
    trendRows,
    recentMember,
  ] = await Promise.all([
    prisma.feedPost.count(),
    prisma.feedPost.count({ where: seededWhere }),
    prisma.feedPost.count({ where: { postedAt: { gte: new Date(now - 7 * DAY_MS) } } }),
    prisma.feedPost.count({ where: { postedAt: { gte: new Date(now - 30 * DAY_MS) } } }),
    prisma.feedPost.count({ where: { membersOnly: true } }),
    prisma.feedHiddenPost.count(),
    prisma.feedPost.aggregate({ _sum: { likes: true, comments: true, shares: true } }),
    prisma.creatorFollow.count(),
    prisma.creatorSubscription.count({ where: { status: "ACTIVE" } }),
    prisma.feedPost.groupBy({ by: ["category"], _count: { _all: true } }),
    prisma.$queryRaw<{ kind: string; count: number }[]>`
      SELECT CASE WHEN "audioJson" IS NOT NULL THEN 'audio'
                  ELSE COALESCE("mediaJson"->>'type', 'text') END AS kind,
             COUNT(*)::int AS count
      FROM "FeedPost"
      GROUP BY 1`,
    prisma.feedPost.groupBy({
      by: ["creatorId"],
      _count: { _all: true },
      orderBy: { _count: { creatorId: "desc" } },
    }),
    prisma.feedPost.findMany({ where: { postedAt: { gte: trendStart } }, select: { postedAt: true } }),
    prisma.feedPost.findMany({
      where: { NOT: seededWhere },
      orderBy: { postedAt: "desc" },
      take: 8,
      select: {
        id: true,
        text: true,
        category: true,
        membersOnly: true,
        postedAt: true,
        mediaJson: true,
        audioJson: true,
        creator: { select: { name: true, handle: true } },
      },
    }),
  ]);

  const topCreatorRows = creatorRows.slice(0, 6);
  const creators = await prisma.creatorUser.findMany({
    where: { id: { in: topCreatorRows.map((row) => row.creatorId) } },
    select: { id: true, name: true, handle: true, slug: true, source: true },
  });
  const creatorById = new Map(creators.map((creator) => [creator.id, creator]));

  return {
    totalPosts,
    memberPosts: totalPosts - seededPosts,
    seededPosts,
    postsLast7Days,
    postsLast30Days,
    creatorsWithPosts: creatorRows.length,
    membersOnlyPosts,
    hiddenByViewers,
    engagement: {
      likes: engagement._sum.likes ?? 0,
      comments: engagement._sum.comments ?? 0,
      shares: engagement._sum.shares ?? 0,
    },
    follows,
    activeSubscriptions,
    categories: categoryRows
      .map((row) => ({ key: row.category, label: titleCase(row.category), count: row._count._all }))
      .sort((a, b) => b.count - a.count),
    mediaKinds: kindRows
      .map((row) => ({ key: row.kind, label: MEDIA_KIND_LABELS[row.kind] ?? titleCase(row.kind), count: row.count }))
      .sort((a, b) => b.count - a.count),
    dailyPosts: buildDailyCounts(
      trendRows.map((row) => row.postedAt),
      trendStart,
    ),
    topCreators: topCreatorRows.flatMap((row) => {
      const creator = creatorById.get(row.creatorId);
      if (!creator) return [];
      return [
        {
          id: creator.id,
          name: creator.name,
          handle: creator.handle,
          slug: creator.slug,
          posts: row._count._all,
          seeded: SEEDED_CREATOR_SOURCES.includes(creator.source),
        },
      ];
    }),
    recentMemberPosts: recentMember.map((post) => ({
      id: post.id,
      excerpt: excerpt(post.text),
      authorName: post.creator.name,
      authorHandle: post.creator.handle,
      category: titleCase(post.category),
      kind: MEDIA_KIND_LABELS[postKind(post)] ?? titleCase(postKind(post)),
      membersOnly: post.membersOnly,
      postedAt: post.postedAt,
    })),
  };
}
