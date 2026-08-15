import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export type PeopleSearchResult = {
  id: string;
  name: string;
  handle: string;
  slug: string | null;
  avatarInitials: string;
  avatarColor: string;
  avatarUrl: string | null;
};

function normalizeHandle(handle: string) {
  const trimmed = handle.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

export async function GET(request: Request) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim();
  if (query.length < 1) {
    return NextResponse.json({ results: [] as PeopleSearchResult[] });
  }

  try {
    const [profiles, creators] = await Promise.all([
      prisma.userProfile.findMany({
        where: {
          userId: { not: user.id },
          OR: [
            { displayName: { contains: query, mode: "insensitive" } },
            { handle: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          userId: true,
          displayName: true,
          handle: true,
          slug: true,
          avatarInitials: true,
          avatarColor: true,
          avatarUrl: true,
        },
        take: 8,
      }),
      prisma.creatorUser.findMany({
        where: {
          OR: [
            { userId: null },
            { userId: { not: user.id } },
          ],
          AND: [
            {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { handle: { contains: query, mode: "insensitive" } },
              ],
            },
          ],
        },
        select: {
          id: true,
          name: true,
          handle: true,
          slug: true,
          avatarInitials: true,
          avatarColor: true,
          avatarUrl: true,
        },
        take: 8,
      }),
    ]);

    const seen = new Set<string>();
    const results: PeopleSearchResult[] = [];

    for (const row of profiles) {
      const handle = normalizeHandle(row.handle);
      const key = (row.slug || handle).toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      results.push({
        id: row.userId,
        name: row.displayName,
        handle,
        slug: row.slug,
        avatarInitials: row.avatarInitials,
        avatarColor: row.avatarColor,
        avatarUrl: row.avatarUrl,
      });
    }

    for (const row of creators) {
      const handle = normalizeHandle(row.handle);
      const key = (row.slug || handle).toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      results.push({
        id: row.id,
        name: row.name,
        handle,
        slug: row.slug,
        avatarInitials: row.avatarInitials,
        avatarColor: row.avatarColor,
        avatarUrl: row.avatarUrl,
      });
    }

    return NextResponse.json({ results: results.slice(0, 8) });
  } catch (error) {
    console.error("GET /api/feed/people error", error);
    return NextResponse.json({ error: "Unable to search people." }, { status: 500 });
  }
}
