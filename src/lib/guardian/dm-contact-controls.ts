import { AccountType } from "@/generated/prisma/client";
import { resolveReceiverUserId } from "@/lib/feed/chat-service";
import { prisma } from "@/lib/prisma";
import { recordSafetyAuditSafe, SAFETY_AUDIT_ACTIONS } from "@/lib/guardian/safety-audit";
import { getSessionUser } from "@/lib/session";

export type DmContactGuardianSettings = {
  dmRestricted: boolean;
  requiresApproval: boolean;
  blocked: boolean;
};

export const DM_RESTRICTED_MESSAGE =
  "Direct messaging with this contact is restricted by a guardian.";

type ThreadPeerRef = {
  id: string;
  peerCreatorId: string | null;
  peerSlug: string | null;
  peerHandle: string;
};

function settingsFromRecord(
  record: DmContactGuardianSettings | null | undefined,
): DmContactGuardianSettings {
  return {
    dmRestricted: record?.dmRestricted ?? false,
    requiresApproval: record?.requiresApproval ?? false,
    blocked: record?.blocked ?? false,
  };
}

export async function getDmContactControlsForThread(
  childUserId: string,
  childThreadId: string,
): Promise<DmContactGuardianSettings> {
  const record = await prisma.guardianDmContactControl.findUnique({
    where: {
      childUserId_childThreadId: {
        childUserId,
        childThreadId,
      },
    },
    select: {
      dmRestricted: true,
      requiresApproval: true,
      blocked: true,
    },
  });

  return settingsFromRecord(record);
}

export async function upsertDmContactControlsForGuardian(input: {
  guardianUserId: string;
  childUserId: string;
  childThreadId: string;
  settings: Partial<DmContactGuardianSettings>;
}): Promise<DmContactGuardianSettings | null> {
  const link = await prisma.guardianChildLink.findUnique({
    where: {
      guardianUserId_childUserId: {
        guardianUserId: input.guardianUserId,
        childUserId: input.childUserId,
      },
    },
    select: { id: true },
  });
  if (!link) return null;

  const thread = await prisma.chatThread.findFirst({
    where: {
      id: input.childThreadId,
      userId: input.childUserId,
      OR: [{ seedKey: null }, { NOT: { seedKey: { startsWith: "guardian:" } } }],
    },
    select: {
      id: true,
      peerCreatorId: true,
      peerSlug: true,
      peerHandle: true,
    },
  });
  if (!thread) return null;

  const peerUserId = await resolveReceiverUserId(thread);
  const previous = await getDmContactControlsForThread(input.childUserId, input.childThreadId);

  const record = await prisma.guardianDmContactControl.upsert({
    where: {
      childUserId_childThreadId: {
        childUserId: input.childUserId,
        childThreadId: input.childThreadId,
      },
    },
    create: {
      childUserId: input.childUserId,
      childThreadId: input.childThreadId,
      peerUserId,
      peerSlug: thread.peerSlug,
      peerHandle: thread.peerHandle,
      dmRestricted: input.settings.dmRestricted ?? false,
      requiresApproval: input.settings.requiresApproval ?? false,
      blocked: input.settings.blocked ?? false,
    },
    update: {
      peerUserId,
      peerSlug: thread.peerSlug,
      peerHandle: thread.peerHandle,
      ...(input.settings.dmRestricted !== undefined
        ? { dmRestricted: input.settings.dmRestricted }
        : {}),
      ...(input.settings.requiresApproval !== undefined
        ? { requiresApproval: input.settings.requiresApproval }
        : {}),
      ...(input.settings.blocked !== undefined ? { blocked: input.settings.blocked } : {}),
    },
    select: {
      dmRestricted: true,
      requiresApproval: true,
      blocked: true,
    },
  });

  const next = settingsFromRecord(record);
  const changed = (Object.keys(next) as Array<keyof DmContactGuardianSettings>).filter(
    (key) => previous[key] !== next[key],
  );
  if (changed.length > 0) {
    const becameBlocked = !previous.blocked && next.blocked;
    await recordSafetyAuditSafe({
      action: becameBlocked ? SAFETY_AUDIT_ACTIONS.SENDER_BLOCKED : SAFETY_AUDIT_ACTIONS.CONTROLS_CHANGED,
      actorUserId: input.guardianUserId,
      childUserId: input.childUserId,
      subjectUserId: peerUserId,
      metadata: {
        childThreadId: input.childThreadId,
        changed,
        settings: next,
      },
    });
  }

  return next;
}

export async function updateDmContactControlsForSession(input: {
  childUserId: string;
  childThreadId: string;
  settings: Partial<DmContactGuardianSettings>;
}): Promise<DmContactGuardianSettings | null> {
  const user = await getSessionUser();
  if (!user || user.accountType !== AccountType.GUARDIAN) return null;

  return upsertDmContactControlsForGuardian({
    guardianUserId: user.id,
    childUserId: input.childUserId,
    childThreadId: input.childThreadId,
    settings: input.settings,
  });
}

export async function getDirectMessagingRestriction(
  senderUserId: string,
  thread: ThreadPeerRef,
): Promise<{ restricted: boolean; message?: string }> {
  const receiverUserId = await resolveReceiverUserId(thread);

  const users = await prisma.user.findMany({
    where: { id: { in: [senderUserId, ...(receiverUserId ? [receiverUserId] : [])] } },
    select: { id: true, accountType: true },
  });

  const sender = users.find((user) => user.id === senderUserId);
  const receiver = receiverUserId ? users.find((user) => user.id === receiverUserId) : null;

  let childUserId: string | null = null;
  let peerUserId: string | null = null;
  let childThreadId: string | null = null;

  if (sender?.accountType === AccountType.MINOR) {
    childUserId = senderUserId;
    peerUserId = receiverUserId;
    childThreadId = thread.id;
  } else if (receiver?.accountType === AccountType.MINOR) {
    childUserId = receiverUserId;
    peerUserId = senderUserId;
  }

  if (!childUserId) {
    return { restricted: false };
  }

  const orFilters = [
    childThreadId ? { childThreadId } : undefined,
    peerUserId ? { peerUserId } : undefined,
  ].filter(Boolean) as Array<{ childThreadId: string } | { peerUserId: string }>;

  if (orFilters.length === 0) {
    return { restricted: false };
  }

  const control = await prisma.guardianDmContactControl.findFirst({
    where: {
      childUserId,
      AND: [
        { OR: orFilters },
        { OR: [{ dmRestricted: true }, { blocked: true }] },
      ],
    },
    select: { dmRestricted: true, blocked: true },
  });

  if (!control) {
    return { restricted: false };
  }

  return {
    restricted: true,
    message: DM_RESTRICTED_MESSAGE,
  };
}
