import { getAppUrl } from "@/lib/api-helpers";
import { ensureChatThreadForUserId, sendChatMessage } from "@/lib/feed/chat-service";
import { getProfileIdentity } from "@/lib/feed/profile-directory";
import { prisma } from "@/lib/prisma";

const MAX_RECIPIENTS = 20;

export type ShareProfileFailure = {
  userId: string;
  name: string;
  error: string;
};

export type ShareProfileOutcome =
  | {
      ok: true;
      sent: number;
      sentUserIds: string[];
      confirmation: string;
      failures: ShareProfileFailure[];
    }
  | { ok: false; status: number; error: string };

export type ShareRecipient = {
  id: string;
  name: string;
  handle: string;
  avatarInitials: string;
  avatarColor: string;
  avatarUrl: string | null;
  verified: boolean;
  followsYou: boolean;
  following: boolean;
};

const shareUserSelect = {
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
} as const;

function displayHandle(handle: string | null | undefined, fallbackEmail?: string | null) {
  const trimmed = handle?.trim();
  if (trimmed) return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
  const local = fallbackEmail?.split("@")[0]?.trim();
  return local ? `@${local}` : "@user";
}

function personName(
  firstName: string | null,
  lastName: string | null,
  displayName: string | null | undefined,
  email: string,
) {
  const fromProfile = displayName?.trim();
  if (fromProfile) return fromProfile;
  const fullName = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ");
  if (fullName) return fullName;
  return email.split("@")[0]?.trim() || "User";
}

function initials(name: string, avatarInitials: string | null | undefined) {
  const fromProfile = avatarInitials?.trim();
  if (fromProfile) return fromProfile;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return (parts[0]?.[0] ?? "U").toUpperCase();
}

/**
 * Signed-in viewer's own network: people who follow them, plus people they follow.
 * Someone in both sets appears once. Ids are user ids so a share can open a DM.
 * Creators the viewer follows who have no linked user account are omitted, because
 * a direct message needs a user.
 */
export async function listViewerShareRecipients(viewerUserId: string): Promise<ShareRecipient[]> {
  const creator = await prisma.creatorUser.findFirst({
    where: { userId: viewerUserId },
    select: { id: true },
  });

  const [followerRows, followingRows] = await Promise.all([
    creator
      ? prisma.creatorFollow.findMany({
          where: { creatorId: creator.id, userId: { not: viewerUserId } },
          orderBy: { createdAt: "desc" },
          include: { user: { select: shareUserSelect } },
        })
      : Promise.resolve([]),
    prisma.creatorFollow.findMany({
      where: {
        userId: viewerUserId,
        creator: { userId: { not: viewerUserId } },
      },
      orderBy: { createdAt: "desc" },
      include: {
        creator: {
          select: {
            userId: true,
            name: true,
            handle: true,
            avatarInitials: true,
            avatarColor: true,
            avatarUrl: true,
            verified: true,
          },
        },
      },
    }),
  ]);

  const byUserId = new Map<string, ShareRecipient>();

  for (const row of followerRows) {
    const user = row.user;
    if (user.id === viewerUserId) continue;
    const profile = user.profile;
    const name = personName(user.firstName, user.lastName, profile?.displayName, user.email);
    byUserId.set(user.id, {
      id: user.id,
      name,
      handle: displayHandle(profile?.handle ?? user.handle, user.email),
      avatarInitials: initials(name, profile?.avatarInitials),
      avatarColor: profile?.avatarColor?.trim() || "#6b9fff",
      avatarUrl: profile?.avatarUrl?.trim() || null,
      verified: Boolean(profile?.verified),
      followsYou: true,
      following: false,
    });
  }

  for (const row of followingRows) {
    const userId = row.creator.userId;
    if (!userId || userId === viewerUserId) continue;
    const existing = byUserId.get(userId);
    if (existing) {
      existing.following = true;
      continue;
    }
    byUserId.set(userId, {
      id: userId,
      name: row.creator.name,
      handle: displayHandle(row.creator.handle),
      avatarInitials: row.creator.avatarInitials,
      avatarColor: row.creator.avatarColor,
      avatarUrl: row.creator.avatarUrl?.trim() || null,
      verified: row.creator.verified,
      followsYou: false,
      following: true,
    });
  }

  return [...byUserId.values()];
}

export function profileShareMessage(name: string, slug: string) {
  const origin = getAppUrl().replace(/\/$/, "");
  return `${name}'s profile: ${origin}/feed/profile/${slug}`;
}

function sentConfirmation(profileName: string, names: string[]) {
  if (names.length === 1) return `Sent ${profileName}'s profile to ${names[0]}.`;
  if (names.length === 2) return `Sent ${profileName}'s profile to ${names[0]} and ${names[1]}.`;
  return `Sent ${profileName}'s profile to ${names[0]}, ${names[1]}, and ${names.length - 2} more.`;
}

function failureFromSend(
  result: Awaited<ReturnType<typeof sendChatMessage>>,
): string | null {
  if (!result) return "Could not send this message.";
  if ("restricted" in result) return result.message;
  if ("moderationRequired" in result) {
    return result.moderation.message || "This message could not be sent.";
  }
  return null;
}

export async function shareProfileWithNetwork(
  senderUserId: string,
  slug: string,
  userIds: string[],
): Promise<ShareProfileOutcome> {
  const uniqueIds = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { ok: false, status: 400, error: "Choose at least one person." };
  }
  if (uniqueIds.length > MAX_RECIPIENTS) {
    return {
      ok: false,
      status: 400,
      error: `You can share with up to ${MAX_RECIPIENTS} people at a time.`,
    };
  }

  const profile = await getProfileIdentity(slug);
  if (!profile) {
    return { ok: false, status: 404, error: "Profile not found." };
  }

  const network = new Map<string, ShareRecipient>(
    (await listViewerShareRecipients(senderUserId)).map((person) => [person.id, person]),
  );
  const targets = uniqueIds
    .map((id) => network.get(id))
    .filter((person): person is ShareRecipient => Boolean(person && person.id !== senderUserId));

  if (targets.length === 0) {
    return { ok: false, status: 400, error: "Choose people you follow or who follow you." };
  }

  const body = profileShareMessage(profile.name, profile.slug);
  const sentUserIds: string[] = [];
  const sentNames: string[] = [];
  const failures: ShareProfileFailure[] = [];

  for (const person of targets) {
    const thread = await ensureChatThreadForUserId(senderUserId, person.id);
    if (!thread) {
      failures.push({
        userId: person.id,
        name: person.name,
        error: "Could not open a conversation.",
      });
      continue;
    }

    const result = await sendChatMessage(senderUserId, thread.id, body);
    const error = failureFromSend(result);
    if (error) {
      failures.push({ userId: person.id, name: person.name, error });
      continue;
    }

    sentUserIds.push(person.id);
    sentNames.push(person.name);
  }

  if (sentUserIds.length === 0) {
    const detail = failures.map((failure) => `${failure.name}: ${failure.error}`).join(" ");
    return {
      ok: false,
      status: 422,
      error: detail || "Could not share this profile.",
    };
  }

  return {
    ok: true,
    sent: sentUserIds.length,
    sentUserIds,
    confirmation: sentConfirmation(profile.name, sentNames),
    failures,
  };
}
