import type {
  DmHoldStatus,
  DmModerationHold,
  DmRecipientTreatment,
  Prisma,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  findOrCreatePeerInboxThread,
  findPeerInboxThread,
  peerThreadDisplayUpdate,
  previewFromBody,
  resolveSenderPeerDisplay,
  type PeerDisplay,
} from "@/lib/feed/chat-service";
import { resolvePolicyAgeZone, type DmSafetyDecision } from "@/lib/guardian/dm-safety-policy";
import { MASKED_DM_PREVIEW, MASKED_PENDING_BODY, REMOVED_BODY } from "@/lib/guardian/is-user-minor";
import {
  guardianCategoryLabel,
  holdActionTakenCopy,
  safetyUserFirstName,
  SAFETY_DISPLAY_USER_SELECT,
  senderInformationalActionTakenCopy,
} from "@/lib/guardian/safety-alert-copy";
import { recordSafetyAudit, SAFETY_AUDIT_ACTIONS } from "@/lib/guardian/safety-audit";
import { createSystemSafetyReport } from "@/lib/guardian/safety-reports";
import {
  getSenderMinorDmRestriction,
  recordStrikeAndEscalate,
  type SenderEnforcement,
} from "@/lib/guardian/sender-enforcement";
import { isMinorAgeZone, type AgeZoneCode } from "@/lib/utils/age-zone";

export const HOLD_EXPIRY_DAYS = 7;
export const ALLOWED_BODY_RETENTION_DAYS = 30;
export const CLOSED_BODY_RETENTION_DAYS = 90;

const DAY_MS = 86_400_000;
const TX_OPTIONS = { timeout: 15_000, maxWait: 10_000 } as const;

type Tx = Prisma.TransactionClient;

export type DmSafetyParticipant = {
  zone: AgeZoneCode;
  ageYears: number | null;
  /** Minor with at least one linked guardian other than the person messaging them. */
  monitored: boolean;
};

/** Zones, monitoring and restriction state for both sides of a DM. */
export async function loadDmSafetyParticipants(
  senderUserId: string,
  recipientUserId: string | null,
): Promise<{
  sender: DmSafetyParticipant;
  recipient: DmSafetyParticipant | null;
  senderRestriction: { endsAt: Date | null } | null;
  /** Sender is a linked guardian of the recipient. */
  senderIsRecipientGuardian: boolean;
}> {
  const ids = recipientUserId ? [senderUserId, recipientUserId] : [senderUserId];
  const [users, links] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, dateOfBirth: true, accountType: true },
    }),
    prisma.guardianChildLink.findMany({
      where: { childUserId: { in: ids } },
      select: { childUserId: true, guardianUserId: true },
    }),
  ]);

  // A guardian messaging their own child can't also be the reviewer for that message.
  const reviewersFor = (childUserId: string) =>
    links.filter(
      (link) => link.childUserId === childUserId && link.guardianUserId !== senderUserId,
    ).length;

  const toParticipant = (userId: string): DmSafetyParticipant => {
    const user = users.find((row) => row.id === userId);
    if (!user) return { zone: "ADULT", ageYears: null, monitored: false };
    const { zone, ageYears } = resolvePolicyAgeZone(user);
    return { zone, ageYears, monitored: isMinorAgeZone(zone) && reviewersFor(userId) > 0 };
  };

  const sender = toParticipant(senderUserId);
  const recipient = recipientUserId ? toParticipant(recipientUserId) : null;
  const senderIsRecipientGuardian = Boolean(
    recipientUserId &&
      links.some(
        (link) => link.childUserId === recipientUserId && link.guardianUserId === senderUserId,
      ),
  );

  const senderRestriction =
    recipient && isMinorAgeZone(recipient.zone)
      ? await getSenderMinorDmRestriction(senderUserId)
      : null;

  return { sender, recipient, senderRestriction, senderIsRecipientGuardian };
}

async function guardianIdsFor(childUserId: string) {
  const links = await prisma.guardianChildLink.findMany({
    where: { childUserId },
    select: { guardianUserId: true },
  });
  return links.map((link) => link.guardianUserId);
}

export async function createDmModerationHold(input: {
  senderUserId: string;
  recipientUserId: string;
  senderThread: { id: string; peerCreatorId: string | null };
  body: string;
  category: string;
  severity: number;
  senderZone: AgeZoneCode;
  recipientZone: AgeZoneCode;
  treatment: DmRecipientTreatment;
  decision: DmSafetyDecision;
}): Promise<{ holdId: string; senderMessageId: string; enforcement: SenderEnforcement | null }> {
  const [peer, users, allRecipientGuardianIds, senderGuardianIds] = await Promise.all([
    resolveSenderPeerDisplay(input.senderUserId, input.senderThread),
    prisma.user.findMany({
      where: { id: { in: [input.senderUserId, input.recipientUserId] } },
      select: SAFETY_DISPLAY_USER_SELECT,
    }),
    guardianIdsFor(input.recipientUserId),
    input.decision.notifySenderGuardians ? guardianIdsFor(input.senderUserId) : Promise.resolve([]),
  ]);
  const recipientGuardianIds = allRecipientGuardianIds.filter((id) => id !== input.senderUserId);

  const recipientFirstName = safetyUserFirstName(users.find((u) => u.id === input.recipientUserId));
  const senderFirstName = safetyUserFirstName(users.find((u) => u.id === input.senderUserId));
  const categoryLabel = guardianCategoryLabel(input.category);
  const counterpartIsAdult = input.senderZone === "ADULT";

  return prisma.$transaction(async (tx) => {
    const now = new Date();

    const senderMessage = await tx.chatMessage.create({
      data: {
        threadId: input.senderThread.id,
        body: input.body,
        fromMe: true,
        deliveryStatus: "PENDING_REVIEW",
      },
      select: { id: true },
    });
    await tx.chatThread.update({
      where: { id: input.senderThread.id },
      data: { preview: previewFromBody(input.body), lastMessageAt: now, unreadCount: 0 },
    });

    const hold = await tx.dmModerationHold.create({
      data: {
        senderUserId: input.senderUserId,
        recipientUserId: input.recipientUserId,
        senderThreadId: input.senderThread.id,
        senderMessageId: senderMessage.id,
        body: input.body,
        category: input.category,
        severity: input.severity,
        senderZone: input.senderZone,
        recipientZone: input.recipientZone,
        recipientTreatment: input.treatment,
        expiresAt: new Date(now.getTime() + HOLD_EXPIRY_DAYS * DAY_MS),
      },
      select: { id: true },
    });
    await tx.chatMessage.update({
      where: { id: senderMessage.id },
      data: { moderationHoldId: hold.id },
    });

    let recipientThreadId: string | null = null;
    let recipientMessageId: string | null = null;
    if (peer && input.treatment === "MASKED_PLACEHOLDER") {
      const recipientThread = await findOrCreatePeerInboxThread(input.recipientUserId, peer, tx);
      const placeholder = await tx.chatMessage.create({
        data: {
          threadId: recipientThread.id,
          body: MASKED_PENDING_BODY,
          fromMe: false,
          contentMasked: true,
          deliveryStatus: "PENDING_REVIEW",
          moderationHoldId: hold.id,
        },
        select: { id: true },
      });
      await tx.chatThread.update({
        where: { id: recipientThread.id },
        data: {
          preview: MASKED_DM_PREVIEW,
          lastMessageAt: now,
          unreadCount: { increment: 1 },
          ...peerThreadDisplayUpdate(peer),
        },
      });
      recipientThreadId = recipientThread.id;
      recipientMessageId = placeholder.id;
    } else if (peer) {
      recipientThreadId = (await findPeerInboxThread(input.recipientUserId, peer, tx))?.id ?? null;
    }
    if (recipientThreadId) {
      await tx.dmModerationHold.update({
        where: { id: hold.id },
        data: { recipientThreadId, recipientMessageId },
      });
    }

    await recordSafetyAudit(
      {
        action: SAFETY_AUDIT_ACTIONS.HOLD_CREATED,
        actorUserId: input.senderUserId,
        childUserId: input.recipientUserId,
        subjectUserId: input.senderUserId,
        holdId: hold.id,
        metadata: {
          category: input.category,
          severity: input.severity,
          recipientZone: input.recipientZone,
          treatment: input.treatment,
        },
      },
      tx,
    );

    for (const guardianUserId of recipientGuardianIds) {
      const alert = await tx.guardianSafetyAlert.create({
        data: {
          guardianUserId,
          childUserId: input.recipientUserId,
          priority: input.decision.alertPriority ?? "high",
          category: categoryLabel,
          actionTaken: holdActionTakenCopy(input.treatment, recipientFirstName),
          status: "AWAITING_DECISION",
          source: "dm_guardian_review",
          chatThreadId: recipientThreadId,
          chatMessageId: senderMessage.id,
          peerUserId: input.senderUserId,
          holdId: hold.id,
          counterpartIsAdult,
        },
        select: { id: true },
      });
      await recordSafetyAudit(
        {
          action: SAFETY_AUDIT_ACTIONS.ALERT_RAISED,
          childUserId: input.recipientUserId,
          subjectUserId: input.senderUserId,
          holdId: hold.id,
          alertId: alert.id,
          metadata: { kind: "hold", guardianUserId },
        },
        tx,
      );
    }

    const alreadyAlerted = new Set(recipientGuardianIds);
    for (const guardianUserId of senderGuardianIds) {
      if (alreadyAlerted.has(guardianUserId)) continue;
      const alert = await tx.guardianSafetyAlert.create({
        data: {
          guardianUserId,
          childUserId: input.senderUserId,
          priority: input.decision.alertPriority ?? "medium",
          category: categoryLabel,
          actionTaken: senderInformationalActionTakenCopy(senderFirstName),
          status: "AWAITING_ACKNOWLEDGEMENT",
          source: "dm_guardian_review",
          chatThreadId: input.senderThread.id,
          chatMessageId: senderMessage.id,
          peerUserId: input.recipientUserId,
          counterpartIsAdult: false,
        },
        select: { id: true },
      });
      await recordSafetyAudit(
        {
          action: SAFETY_AUDIT_ACTIONS.ALERT_RAISED,
          childUserId: input.senderUserId,
          subjectUserId: input.recipientUserId,
          holdId: hold.id,
          alertId: alert.id,
          metadata: { kind: "informational", guardianUserId },
        },
        tx,
      );
    }

    const enforcement = input.decision.recordStrike
      ? await recordStrikeAndEscalate(tx, {
          userId: input.senderUserId,
          holdId: hold.id,
          category: input.category,
          severity: input.severity,
          childUserId: input.recipientUserId,
        })
      : null;

    if (input.decision.autoReport) {
      await createSystemSafetyReport(
        {
          subjectUserId: input.senderUserId,
          reason: "sexual_content_to_minor",
          holdId: hold.id,
          childUserId: input.recipientUserId,
          mandatoryReportCandidate: true,
        },
        tx,
      );
    }

    return { holdId: hold.id, senderMessageId: senderMessage.id, enforcement };
  }, TX_OPTIONS);
}

class HoldAlreadyDecidedError extends Error {}

async function senderPeerDisplayForHold(hold: Pick<DmModerationHold, "senderUserId" | "senderThreadId">) {
  const senderThread = await prisma.chatThread.findUnique({
    where: { id: hold.senderThreadId },
    select: { peerCreatorId: true },
  });
  return resolveSenderPeerDisplay(hold.senderUserId, senderThread);
}

async function deliverHeldMessage(tx: Tx, hold: DmModerationHold, peer: PeerDisplay | null, now: Date) {
  const body = hold.body ?? "";

  if (hold.recipientMessageId) {
    const updated = await tx.chatMessage.updateMany({
      where: { id: hold.recipientMessageId },
      data: { body, contentMasked: false, deliveryStatus: "DELIVERED" },
    });
    if (updated.count > 0) {
      if (hold.recipientThreadId) {
        await tx.chatThread.updateMany({
          where: { id: hold.recipientThreadId },
          data: { preview: previewFromBody(body) },
        });
      }
      return hold.recipientThreadId;
    }
  }

  let threadId: string | null = null;
  if (hold.recipientThreadId) {
    const existing = await tx.chatThread.findFirst({
      where: { id: hold.recipientThreadId, userId: hold.recipientUserId },
      select: { id: true },
    });
    threadId = existing?.id ?? null;
  }
  if (!threadId && peer) {
    threadId = (await findOrCreatePeerInboxThread(hold.recipientUserId, peer, tx)).id;
  }
  if (!threadId) return null;

  const message = await tx.chatMessage.create({
    data: {
      threadId,
      body,
      fromMe: false,
      deliveryStatus: "DELIVERED",
      moderationHoldId: hold.id,
    },
    select: { id: true },
  });
  await tx.chatThread.update({
    where: { id: threadId },
    data: {
      preview: previewFromBody(body),
      lastMessageAt: now,
      unreadCount: { increment: 1 },
      ...(peer ? peerThreadDisplayUpdate(peer) : {}),
    },
  });
  await tx.dmModerationHold.update({
    where: { id: hold.id },
    data: { recipientThreadId: threadId, recipientMessageId: message.id },
  });
  return threadId;
}

async function applyAllow(
  tx: Tx,
  hold: DmModerationHold,
  peer: PeerDisplay | null,
  guardianUserId: string,
  now: Date,
) {
  await tx.chatMessage.updateMany({
    where: { id: hold.senderMessageId },
    data: { deliveryStatus: "DELIVERED" },
  });

  const recipientThreadId = await deliverHeldMessage(tx, hold, peer, now);

  const voided = await tx.senderSafetyStrike.updateMany({
    where: { holdId: hold.id, voidedAt: null },
    data: { voidedAt: now, voidReason: "guardian_allowed" },
  });

  if (hold.recipientZone === "KIDS" && recipientThreadId) {
    const band = await tx.childContactTrustBand.findUnique({
      where: {
        childUserId_contactKey: { childUserId: hold.recipientUserId, contactKey: recipientThreadId },
      },
      select: { id: true },
    });
    if (!band) {
      await tx.childContactTrustBand.create({
        data: {
          guardianUserId,
          childUserId: hold.recipientUserId,
          contactKey: recipientThreadId,
          contactKind: "dm",
          trustBand: "approved_wider",
        },
      });
      await recordSafetyAudit(
        {
          action: SAFETY_AUDIT_ACTIONS.TRUST_BAND_ASSIGNED,
          actorUserId: guardianUserId,
          childUserId: hold.recipientUserId,
          subjectUserId: hold.senderUserId,
          holdId: hold.id,
          metadata: { trustBand: "approved_wider", contactKey: recipientThreadId },
        },
        tx,
      );
    }
  }

  await tx.guardianSafetyAlert.updateMany({
    where: { holdId: hold.id },
    data: { status: "ALLOWED", resolvedAt: now, resolvedByUserId: guardianUserId },
  });

  await recordSafetyAudit(
    {
      action: SAFETY_AUDIT_ACTIONS.HOLD_ALLOWED,
      actorUserId: guardianUserId,
      childUserId: hold.recipientUserId,
      subjectUserId: hold.senderUserId,
      holdId: hold.id,
    },
    tx,
  );
  if (voided.count > 0) {
    await recordSafetyAudit(
      {
        action: SAFETY_AUDIT_ACTIONS.STRIKE_VOIDED,
        actorUserId: guardianUserId,
        childUserId: hold.recipientUserId,
        subjectUserId: hold.senderUserId,
        holdId: hold.id,
        metadata: { reason: "guardian_allowed" },
      },
      tx,
    );
  }
}

async function applyNotDelivered(
  tx: Tx,
  hold: DmModerationHold,
  status: "REJECTED" | "EXPIRED",
  actorUserId: string | null,
  now: Date,
) {
  await tx.chatMessage.updateMany({
    where: { id: hold.senderMessageId },
    data: { deliveryStatus: "NOT_DELIVERED" },
  });

  if (hold.recipientMessageId) {
    await tx.chatMessage.updateMany({
      where: { id: hold.recipientMessageId },
      data: { body: REMOVED_BODY, contentMasked: true, deliveryStatus: "NOT_DELIVERED" },
    });
  }

  await tx.guardianSafetyAlert.updateMany({
    where: { holdId: hold.id },
    data: { status, resolvedAt: now, resolvedByUserId: actorUserId },
  });

  await recordSafetyAudit(
    {
      action: status === "REJECTED" ? SAFETY_AUDIT_ACTIONS.HOLD_REJECTED : SAFETY_AUDIT_ACTIONS.HOLD_EXPIRED,
      actorUserId,
      childUserId: hold.recipientUserId,
      subjectUserId: hold.senderUserId,
      holdId: hold.id,
    },
    tx,
  );
}

export type DecideDmHoldResult =
  | { ok: true; status: DmHoldStatus }
  | { ok: false; status: 404; error: string }
  | { ok: false; status: 409; code: "HOLD_ALREADY_DECIDED"; error: string; holdStatus: DmHoldStatus };

export async function decideDmHold(
  holdId: string,
  guardianUserId: string,
  decision: "allow" | "reject",
): Promise<DecideDmHoldResult> {
  const hold = await prisma.dmModerationHold.findUnique({ where: { id: holdId } });
  if (!hold || hold.senderUserId === guardianUserId) {
    return { ok: false, status: 404, error: "Alert not found." };
  }

  const link = await prisma.guardianChildLink.findUnique({
    where: {
      guardianUserId_childUserId: { guardianUserId, childUserId: hold.recipientUserId },
    },
    select: { id: true },
  });
  if (!link) return { ok: false, status: 404, error: "Alert not found." };

  const alreadyDecided = (holdStatus: DmHoldStatus): DecideDmHoldResult => ({
    ok: false,
    status: 409,
    code: "HOLD_ALREADY_DECIDED",
    error:
      holdStatus === "ALLOWED"
        ? "Another guardian already allowed this message."
        : holdStatus === "REJECTED"
          ? "Another guardian already rejected this message."
          : "This message was not reviewed in time and was not delivered.",
    holdStatus,
  });

  if (hold.status !== "PENDING") return alreadyDecided(hold.status);

  const peer = decision === "allow" ? await senderPeerDisplayForHold(hold) : null;
  const nextStatus: DmHoldStatus = decision === "allow" ? "ALLOWED" : "REJECTED";

  try {
    await prisma.$transaction(async (tx) => {
      const now = new Date();
      const moved = await tx.dmModerationHold.updateMany({
        where: { id: hold.id, status: "PENDING" },
        data: { status: nextStatus, decidedByUserId: guardianUserId, decidedAt: now },
      });
      if (moved.count === 0) throw new HoldAlreadyDecidedError();

      if (decision === "allow") {
        await applyAllow(tx, hold, peer, guardianUserId, now);
      } else {
        await applyNotDelivered(tx, hold, "REJECTED", guardianUserId, now);
      }
    }, TX_OPTIONS);
  } catch (error) {
    if (!(error instanceof HoldAlreadyDecidedError)) throw error;
    const current = await prisma.dmModerationHold.findUnique({
      where: { id: hold.id },
      select: { status: true },
    });
    return alreadyDecided(current?.status ?? "EXPIRED");
  }

  return { ok: true, status: nextStatus };
}

/** Expire overdue PENDING holds. Scoped to users (either side) when `userIds` is given. */
export async function expireOverdueHolds(options: { userIds?: string[]; limit?: number } = {}) {
  if (typeof prisma.dmModerationHold?.findMany !== "function") return 0;
  const now = new Date();
  const where: Prisma.DmModerationHoldWhereInput = {
    status: "PENDING",
    expiresAt: { lte: now },
    ...(options.userIds?.length
      ? {
          OR: [
            { senderUserId: { in: options.userIds } },
            { recipientUserId: { in: options.userIds } },
          ],
        }
      : {}),
  };

  const overdue = await prisma.dmModerationHold.findMany({
    where,
    orderBy: { expiresAt: "asc" },
    take: options.limit ?? 100,
  });

  let expired = 0;
  for (const hold of overdue) {
    const didExpire = await prisma.$transaction(async (tx) => {
      const decidedAt = new Date();
      const moved = await tx.dmModerationHold.updateMany({
        where: { id: hold.id, status: "PENDING" },
        data: { status: "EXPIRED", decidedAt },
      });
      if (moved.count === 0) return false;
      await applyNotDelivered(tx, hold, "EXPIRED", null, decidedAt);
      return true;
    }, TX_OPTIONS);
    if (didExpire) expired += 1;
  }
  return expired;
}

/** Null out held bodies past retention (30 days allowed; 90 days rejected/expired without open report). */
export async function purgeHeldBodies() {
  const now = new Date();
  const allowed = await prisma.dmModerationHold.updateMany({
    where: {
      status: "ALLOWED",
      decidedAt: { lte: new Date(now.getTime() - ALLOWED_BODY_RETENTION_DAYS * DAY_MS) },
      body: { not: null },
    },
    data: { body: null, bodyPurgedAt: now },
  });

  const closedCandidates = await prisma.dmModerationHold.findMany({
    where: {
      status: { in: ["REJECTED", "EXPIRED"] },
      decidedAt: { lte: new Date(now.getTime() - CLOSED_BODY_RETENTION_DAYS * DAY_MS) },
      body: { not: null },
    },
    select: { id: true },
  });
  const candidateIds = closedCandidates.map((hold) => hold.id);
  let closedPurged = 0;
  if (candidateIds.length > 0) {
    const openReports = await prisma.safetyReport.findMany({
      where: { holdId: { in: candidateIds }, status: { in: ["OPEN", "IN_REVIEW"] } },
      select: { holdId: true },
    });
    const keep = new Set(openReports.map((report) => report.holdId));
    const purgeIds = candidateIds.filter((id) => !keep.has(id));
    if (purgeIds.length > 0) {
      const result = await prisma.dmModerationHold.updateMany({
        where: { id: { in: purgeIds } },
        data: { body: null, bodyPurgedAt: now },
      });
      closedPurged = result.count;
    }
  }

  return { allowedPurged: allowed.count, closedPurged };
}

/**
 * Recipient thread for a hold, created silently (no message, no unread) when it doesn't exist yet,
 * so guardians can block a sender whose message was withheld.
 */
export async function ensureRecipientThreadForHold(holdId: string): Promise<string | null> {
  const hold = await prisma.dmModerationHold.findUnique({ where: { id: holdId } });
  if (!hold) return null;
  if (hold.recipientThreadId) {
    const existing = await prisma.chatThread.findFirst({
      where: { id: hold.recipientThreadId, userId: hold.recipientUserId },
      select: { id: true },
    });
    if (existing) return existing.id;
  }

  const peer = await senderPeerDisplayForHold(hold);
  if (!peer) return null;
  const thread = await findOrCreatePeerInboxThread(hold.recipientUserId, peer);

  await prisma.$transaction([
    prisma.dmModerationHold.update({
      where: { id: hold.id },
      data: { recipientThreadId: thread.id },
    }),
    prisma.guardianSafetyAlert.updateMany({
      where: { holdId: hold.id },
      data: { chatThreadId: thread.id },
    }),
  ]);
  return thread.id;
}
