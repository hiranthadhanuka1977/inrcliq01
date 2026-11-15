import { listDmBlocksForUser } from "@/lib/feed/dm-participant-controls";
import { listViewerShareRecipients, type ShareRecipient } from "@/lib/feed/share-profile";
import { prisma } from "@/lib/prisma";

export type MessagePeopleResult = {
  network: ShareRecipient[];
  others: ShareRecipient[];
};

const NETWORK_LIMIT = 40;
const OTHER_LIMIT = 12;

function normalizeQuery(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function matchesPerson(person: ShareRecipient, query: string) {
  if (!query) return true;
  const handle = person.handle.replace(/^@/, "").toLowerCase();
  return person.name.toLowerCase().includes(query) || handle.includes(query);
}

function displayHandle(handle: string | null | undefined, fallback?: string | null) {
  const trimmed = handle?.trim();
  if (trimmed) return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
  const local = fallback?.split("@")[0]?.trim();
  return local ? `@${local}` : "@user";
}

function initials(name: string, avatarInitials: string | null | undefined) {
  const fromProfile = avatarInitials?.trim();
  if (fromProfile) return fromProfile.slice(0, 2).toUpperCase();
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return (parts[0]?.[0] ?? "U").toUpperCase();
}

/**
 * People the signed-in user can start a chat with.
 * Network is followers plus people they follow. Others are everyone else on the platform
 * whose name or handle matches the query.
 */
export async function searchPeopleToMessage(
  viewerUserId: string,
  rawQuery: string,
): Promise<MessagePeopleResult> {
  const query = normalizeQuery(rawQuery);
  const [network, blocks] = await Promise.all([
    listViewerShareRecipients(viewerUserId),
    listDmBlocksForUser(viewerUserId),
  ]);

  const blocked = new Set<string>();
  for (const row of blocks) {
    if (row.blockerUserId === viewerUserId) blocked.add(row.blockedUserId);
    if (row.blockedUserId === viewerUserId) blocked.add(row.blockerUserId);
  }

  const known = network.filter((person) => person.id !== viewerUserId && !blocked.has(person.id));
  const networkMatches = (query ? known.filter((person) => matchesPerson(person, query)) : known).slice(
    0,
    NETWORK_LIMIT,
  );

  const excluded = new Set<string>([viewerUserId, ...known.map((person) => person.id), ...blocked]);

  if (!query) {
    if (networkMatches.length > 0) return { network: networkMatches, others: [] };
    const suggested = await findOtherUsers(excluded, "", 8);
    return { network: [], others: suggested };
  }
  return { network: networkMatches, others: await findOtherUsers(excluded, query, OTHER_LIMIT) };
}

async function findOtherUsers(excluded: Set<string>, query: string, take: number): Promise<ShareRecipient[]> {
  const users = await prisma.user.findMany({
    where: {
      id: { notIn: [...excluded] },
      suspendedAt: null,
      ...(query
        ? {
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { handle: { contains: query, mode: "insensitive" } },
              { profile: { is: { displayName: { contains: query, mode: "insensitive" } } } },
              { profile: { is: { handle: { contains: query, mode: "insensitive" } } } },
              { creatorProfile: { is: { name: { contains: query, mode: "insensitive" } } } },
              { creatorProfile: { is: { handle: { contains: query, mode: "insensitive" } } } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      handle: true,
      email: true,
      profile: {
        select: {
          displayName: true,
          handle: true,
          avatarInitials: true,
          avatarColor: true,
          avatarUrl: true,
          verified: true,
        },
      },
      creatorProfile: {
        select: {
          name: true,
          handle: true,
          avatarInitials: true,
          avatarColor: true,
          avatarUrl: true,
          verified: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  return users.map((user) => {
    const profile = user.profile;
    const creator = user.creatorProfile;
    const name =
      profile?.displayName?.trim() ||
      creator?.name?.trim() ||
      [user.firstName?.trim(), user.lastName?.trim()].filter(Boolean).join(" ") ||
      user.email.split("@")[0]?.trim() ||
      "Member";
    return {
      id: user.id,
      name,
      handle: displayHandle(profile?.handle || user.handle || creator?.handle, user.email),
      avatarInitials: initials(name, profile?.avatarInitials || creator?.avatarInitials),
      avatarColor: profile?.avatarColor?.trim() || creator?.avatarColor?.trim() || "#6b9fff",
      avatarUrl: profile?.avatarUrl?.trim() || creator?.avatarUrl?.trim() || null,
      verified: Boolean(profile?.verified || creator?.verified),
      followsYou: false,
      following: false,
    };
  });
}
