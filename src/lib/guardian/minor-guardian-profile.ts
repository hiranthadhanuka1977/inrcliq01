import { ApprovalStatus } from "@/generated/prisma/client";
import { resolveUserDisplayName } from "@/lib/auth/display-name";
import { ensureGuardianChatThreadForMinor } from "@/lib/feed/chat-service";
import { prisma } from "@/lib/prisma";

export type MinorGuardianSummary = {
  id: string;
  fullName: string;
  handleLabel: string;
  messagesHref: string;
};

function guardianHandleLabel(
  handle: string | null | undefined,
  profileHandle: string | null | undefined,
  email: string,
) {
  const fromUser = handle?.trim().replace(/^@/, "");
  if (fromUser) return `@${fromUser}`;

  const fromProfile = profileHandle?.trim().replace(/^@/, "");
  if (fromProfile) return `@${fromProfile}`;

  const local = email.split("@")[0]?.trim();
  return local ? `@${local}` : "@guardian";
}

function guardianInitials(name: string, avatarInitials: string | null | undefined) {
  const fromProfile = avatarInitials?.trim();
  if (fromProfile) return fromProfile;

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "G";
}

export async function getMinorGuardianSummary(
  minorUserId: string,
): Promise<MinorGuardianSummary | null> {
  const link = await prisma.guardianChildLink.findFirst({
    where: { childUserId: minorUserId },
    orderBy: { linkedAt: "desc" },
    include: {
      guardianUser: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          handle: true,
          profile: {
            select: {
              displayName: true,
              handle: true,
              slug: true,
              avatarInitials: true,
              avatarColor: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  let guardian = link?.guardianUser ?? null;

  if (!guardian) {
    const request = await prisma.parentApprovalRequest.findFirst({
      where: {
        childUserId: minorUserId,
        status: ApprovalStatus.APPROVED,
        guardianUserId: { not: null },
      },
      orderBy: { resolvedAt: "desc" },
      include: {
        guardianUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            handle: true,
            profile: {
              select: {
                displayName: true,
                handle: true,
                slug: true,
                avatarInitials: true,
                avatarColor: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
    guardian = request?.guardianUser ?? null;
  }

  if (!guardian) return null;

  const fullName = resolveUserDisplayName({
    email: guardian.email,
    firstName: guardian.firstName,
    lastName: guardian.lastName,
    displayName: guardian.profile?.displayName,
  });

  const thread = await ensureGuardianChatThreadForMinor(minorUserId, {
    guardianUserId: guardian.id,
    fullName,
    handleLabel: guardianHandleLabel(
      guardian.handle,
      guardian.profile?.handle,
      guardian.email,
    ),
    avatarInitials: guardianInitials(fullName, guardian.profile?.avatarInitials),
    avatarColor: guardian.profile?.avatarColor?.trim() || "#6b9fff",
    avatarUrl: guardian.profile?.avatarUrl?.trim() || null,
    slug: guardian.profile?.slug?.trim() || null,
  });

  return {
    id: guardian.id,
    fullName,
    handleLabel: guardianHandleLabel(
      guardian.handle,
      guardian.profile?.handle,
      guardian.email,
    ),
    messagesHref: `/feed/messages?thread=${thread.id}`,
  };
}
