import type {
  DmHoldStatus,
  DmRecipientTreatment,
  SafetyAlertStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { findPeerInboxThread, resolveSenderPeerDisplay } from "@/lib/feed/chat-service";
import {
  decideDmHold,
  ensureRecipientThreadForHold,
  expireOverdueHolds,
} from "@/lib/guardian/dm-moderation-hold";
import { resolvePolicyAgeZone } from "@/lib/guardian/dm-safety-policy";
import { upsertDmContactControlsForGuardian } from "@/lib/guardian/dm-contact-controls";
import {
  guardianCategoryLabel,
  holdActionTakenCopy,
  maskedDeliveryActionTakenCopy,
  priorityForCategory,
  priorityLabel,
  SAFETY_ALERT_STATUS_LABELS,
  SAFETY_DISPLAY_USER_SELECT,
  safetyUserDisplayName,
  safetyUserFirstName,
  safetyUserHandle,
} from "@/lib/guardian/safety-alert-copy";
import { recordSafetyAudit, recordSafetyAuditSafe, SAFETY_AUDIT_ACTIONS } from "@/lib/guardian/safety-audit";
import {
  createGuardianSafetyReport,
  REPORT_DETAILS_MAX_LENGTH,
  type GuardianReportReason,
} from "@/lib/guardian/safety-reports";
import { lightMaskDmText } from "@/lib/moderation/light-mask";
import {
  AGE_ZONE_DESCRIPTIONS,
  AGE_ZONE_ICON_BADGE_KEYS,
  AGE_ZONE_LABELS,
  type AgeZoneCode,
} from "@/lib/utils/age-zone";

export type SafetyAlertAgeZoneBadge = {
  iconBadgeKey: string;
  zone: AgeZoneCode;
  zoneLabel: string;
  age: number | null;
  description: string;
};

export type SafetyAlertCounterpart = {
  userId: string;
  name: string;
  handle: string | null;
  isAdult: boolean;
};

export type FamilySafetyAlertCard = {
  id: string;
  priority: "high" | "medium";
  priorityLabel: string;
  childId: string;
  childName: string;
  childFirstName: string;
  childBadge: SafetyAlertAgeZoneBadge | null;
  category: string;
  channel: string;
  actionTaken: string;
  /** Hold alerts: "{Counterpart} tried to send {Child} a direct message flagged as sexual in nature." */
  bodyLine: string | null;
  timeAgo: string;
  status: string;
  statusCode: SafetyAlertStatus;
  kind: "decision" | "informational";
  counterpart: SafetyAlertCounterpart | null;
  counterpartBlocked: boolean;
  canBlock: boolean;
  holdId: string | null;
  holdStatus: DmHoldStatus | null;
  recipientTreatment: DmRecipientTreatment | null;
  recipientZone: AgeZoneCode | null;
  canDecide: boolean;
  contentAvailable: boolean;
  reviewSettingsHref: string | null;
  messageChildHref: string | null;
};

export const UNRESOLVED_ALERT_STATUSES: SafetyAlertStatus[] = [
  "AWAITING_DECISION",
  "AWAITING_ACKNOWLEDGEMENT",
];

function formatTimeAgo(date: Date) {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 45) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

function isMissingAlertModel(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("GuardianSafetyAlert") ||
    message.includes("guardianSafetyAlert") ||
    message.includes("does not exist")
  );
}

function ageZoneBadgeFor(user: { dateOfBirth: Date | null; accountType: string }): SafetyAlertAgeZoneBadge {
  const { zone, ageYears } = resolvePolicyAgeZone(user);
  return {
    iconBadgeKey: AGE_ZONE_ICON_BADGE_KEYS[zone],
    zone,
    zoneLabel: AGE_ZONE_LABELS[zone],
    age: ageYears,
    description: AGE_ZONE_DESCRIPTIONS[zone],
  };
}

async function guardianChildIds(guardianUserId: string) {
  const links = await prisma.guardianChildLink.findMany({
    where: { guardianUserId },
    select: { childUserId: true },
  });
  return links.map((link) => link.childUserId);
}

async function isGuardianOf(guardianUserId: string, childUserId: string) {
  const link = await prisma.guardianChildLink.findUnique({
    where: { guardianUserId_childUserId: { guardianUserId, childUserId } },
    select: { id: true },
  });
  return Boolean(link);
}

/**
 * Guardian alerts for a masked (legacy) DM delivery involving a linked minor.
 * Never stores raw message text — category + safe action summary only.
 */
export async function createDmModerationSafetyAlerts(input: {
  senderUserId: string;
  receiverUserId: string | null;
  chatThreadId: string;
  chatMessageId: string;
  category: string | null | undefined;
  priority?: "high" | "medium" | null;
  senderIsAdult?: boolean;
  recipientIsAdult?: boolean;
}) {
  try {
    if (typeof prisma.guardianSafetyAlert?.upsert !== "function") return;

    const participantIds = [input.senderUserId, input.receiverUserId].filter(
      (id): id is string => Boolean(id),
    );
    const users = await prisma.user.findMany({
      where: { id: { in: participantIds } },
      select: SAFETY_DISPLAY_USER_SELECT,
    });

    const childIds = users
      .filter((user) => resolvePolicyAgeZone(user).zone !== "ADULT")
      .map((user) => user.id);
    if (childIds.length === 0) return;

    const category = guardianCategoryLabel(input.category);
    const priority = input.priority ?? priorityForCategory(input.category);

    for (const childUserId of new Set(childIds)) {
      const links = await prisma.guardianChildLink.findMany({
        where: { childUserId },
        select: { guardianUserId: true },
      });
      if (links.length === 0) continue;

      const childIsSender = childUserId === input.senderUserId;
      const peerUserId = childIsSender ? input.receiverUserId : input.senderUserId;
      const childFirstName = safetyUserFirstName(users.find((user) => user.id === childUserId));
      const counterpartIsAdult = childIsSender
        ? Boolean(input.recipientIsAdult)
        : Boolean(input.senderIsAdult);

      for (const link of links) {
        const alert = await prisma.guardianSafetyAlert.upsert({
          where: {
            guardianUserId_chatMessageId: {
              guardianUserId: link.guardianUserId,
              chatMessageId: input.chatMessageId,
            },
          },
          create: {
            guardianUserId: link.guardianUserId,
            childUserId,
            priority,
            category,
            actionTaken: maskedDeliveryActionTakenCopy(childFirstName, childIsSender),
            status: "AWAITING_ACKNOWLEDGEMENT",
            source: "dm_text_moderation",
            chatThreadId: input.chatThreadId,
            chatMessageId: input.chatMessageId,
            peerUserId: peerUserId ?? null,
            counterpartIsAdult,
          },
          update: {},
          select: { id: true, createdAt: true },
        });
        await recordSafetyAuditSafe({
          action: SAFETY_AUDIT_ACTIONS.ALERT_RAISED,
          childUserId,
          subjectUserId: peerUserId ?? null,
          alertId: alert.id,
          metadata: {
            kind: childIsSender ? "informational" : "masked",
            guardianUserId: link.guardianUserId,
          },
        });
      }
    }
  } catch (error) {
    if (isMissingAlertModel(error)) {
      console.warn("GuardianSafetyAlert model unavailable; skipping safety alert create");
      return;
    }
    console.error("createDmModerationSafetyAlerts failed", error);
  }
}

const alertInclude = {
  child: { select: SAFETY_DISPLAY_USER_SELECT },
  hold: {
    select: {
      id: true,
      status: true,
      recipientTreatment: true,
      recipientZone: true,
      recipientThreadId: true,
      senderUserId: true,
      bodyPurgedAt: true,
      expiresAt: true,
      contentType: true,
    },
  },
} as const;

type AlertRow = Awaited<
  ReturnType<typeof prisma.guardianSafetyAlert.findMany<{ include: typeof alertInclude }>>
>[number];

/** Child's own DM thread with the counterpart (for Block / Review DM settings), if it exists. */
async function childThreadIdForAlert(row: AlertRow): Promise<string | null> {
  if (row.hold) return row.hold.recipientThreadId;
  if (row.chatThreadId) {
    const thread = await prisma.chatThread.findFirst({
      where: { id: row.chatThreadId, userId: row.childUserId },
      select: { id: true },
    });
    if (thread) return thread.id;
  }
  if (!row.peerUserId) return null;
  const peer = await resolveSenderPeerDisplay(row.peerUserId, null);
  if (!peer) return null;
  return (await findPeerInboxThread(row.childUserId, peer))?.id ?? null;
}

async function buildAlertCards(guardianUserId: string, rows: AlertRow[]): Promise<FamilySafetyAlertCard[]> {
  if (rows.length === 0) return [];

  const peerIds = [...new Set(rows.map((row) => row.peerUserId).filter((id): id is string => Boolean(id)))];
  const childIds = [...new Set(rows.map((row) => row.childUserId))];

  const [peers, guardianThreads, controls, childThreadIds] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: peerIds } }, select: SAFETY_DISPLAY_USER_SELECT }),
    prisma.chatThread.findMany({
      where: { userId: guardianUserId, seedKey: { in: childIds.map((id) => `child:${id}`) } },
      select: { id: true, seedKey: true },
    }),
    prisma.guardianDmContactControl.findMany({
      where: { childUserId: { in: childIds }, blocked: true },
      select: { childUserId: true, childThreadId: true, peerUserId: true },
    }),
    Promise.all(rows.map((row) => childThreadIdForAlert(row))),
  ]);

  const peersById = new Map(peers.map((peer) => [peer.id, peer]));
  const guardianThreadByChild = new Map(
    guardianThreads.map((thread) => [thread.seedKey?.replace(/^child:/, "") ?? "", thread.id]),
  );

  return rows.map((row, index) => {
    const priority = row.priority === "medium" ? "medium" : "high";
    const childName = safetyUserDisplayName(row.child);
    const childFirstName = safetyUserFirstName(row.child);
    const peer = row.peerUserId ? peersById.get(row.peerUserId) : undefined;
    const counterpart: SafetyAlertCounterpart | null = peer
      ? {
          userId: peer.id,
          name: safetyUserDisplayName(peer),
          handle: safetyUserHandle(peer),
          isAdult: row.counterpartIsAdult,
        }
      : null;
    const childThreadId = childThreadIds[index] ?? null;
    const counterpartBlocked = controls.some(
      (control) =>
        control.childUserId === row.childUserId &&
        ((row.peerUserId && control.peerUserId === row.peerUserId) ||
          (childThreadId && control.childThreadId === childThreadId)),
    );
    const guardianThreadId = guardianThreadByChild.get(row.childUserId);
    const hold = row.hold;

    return {
      id: row.id,
      priority,
      priorityLabel: priorityLabel(priority),
      childId: row.childUserId,
      childName,
      childFirstName,
      childBadge: ageZoneBadgeFor(row.child),
      category: row.category,
      channel: "Direct message",
      actionTaken: hold
        ? holdActionTakenCopy(hold.recipientTreatment, childFirstName, hold.status)
        : row.actionTaken,
      bodyLine: hold
        ? `${counterpart?.name ?? "Someone"} tried to send ${childFirstName} a direct message flagged as sexual in nature.`
        : null,
      timeAgo: formatTimeAgo(row.createdAt),
      status: SAFETY_ALERT_STATUS_LABELS[row.status],
      statusCode: row.status,
      kind: hold ? "decision" : "informational",
      counterpart,
      counterpartBlocked,
      canBlock: Boolean(counterpart) && (Boolean(hold) || Boolean(childThreadId)),
      holdId: hold?.id ?? null,
      holdStatus: hold?.status ?? null,
      recipientTreatment: hold?.recipientTreatment ?? null,
      recipientZone: hold?.recipientZone ?? null,
      canDecide: hold?.status === "PENDING" && row.status === "AWAITING_DECISION",
      contentAvailable: Boolean(hold && !hold.bodyPurgedAt),
      reviewSettingsHref: childThreadId
        ? `/family-circle/accounts/${row.childUserId}/dm/${childThreadId}`
        : null,
      messageChildHref: guardianThreadId ? `/feed/messages?thread=${guardianThreadId}` : null,
    };
  });
}

async function expireHoldsForGuardian(guardianUserId: string) {
  try {
    const childIds = await guardianChildIds(guardianUserId);
    if (childIds.length > 0) await expireOverdueHolds({ userIds: childIds });
  } catch (error) {
    console.error("lazy DM hold expiry (guardian) failed", error);
  }
}

export async function listSafetyAlertCardsForGuardian(
  guardianUserId: string,
): Promise<FamilySafetyAlertCard[]> {
  try {
    if (typeof prisma.guardianSafetyAlert?.findMany !== "function") return [];
    await expireHoldsForGuardian(guardianUserId);

    // Pending decisions are always included and pinned to the top; everything else newest-first.
    const [pending, recent] = await Promise.all([
      prisma.guardianSafetyAlert.findMany({
        where: { guardianUserId, status: "AWAITING_DECISION" },
        orderBy: { createdAt: "desc" },
        include: alertInclude,
      }),
      prisma.guardianSafetyAlert.findMany({
        where: { guardianUserId, status: { not: "AWAITING_DECISION" } },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: alertInclude,
      }),
    ]);

    return buildAlertCards(guardianUserId, [...pending, ...recent]);
  } catch (error) {
    if (isMissingAlertModel(error)) return [];
    console.error("listSafetyAlertCardsForGuardian failed", error);
    return [];
  }
}

async function loadAlertForGuardian(guardianUserId: string, alertId: string) {
  const row = await prisma.guardianSafetyAlert.findFirst({
    where: { id: alertId, guardianUserId },
    include: alertInclude,
  });
  if (!row) return null;
  if (!(await isGuardianOf(guardianUserId, row.childUserId))) return null;
  return row;
}

export async function getSafetyAlertDetailForGuardian(guardianUserId: string, alertId: string) {
  await expireHoldsForGuardian(guardianUserId);
  const row = await loadAlertForGuardian(guardianUserId, alertId);
  if (!row) return null;
  const [card] = await buildAlertCards(guardianUserId, [row]);
  if (!card) return null;

  return {
    alert: card,
    hold: row.hold
      ? {
          status: row.hold.status,
          recipientTreatment: row.hold.recipientTreatment,
          contentType: row.hold.contentType,
          expiresAt: row.hold.expiresAt.toISOString(),
          canDecide: card.canDecide,
          counterpart: card.counterpart,
          reviewSettingsHref: card.reviewSettingsHref,
        }
      : null,
  };
}

export type ViewHeldMessageResult =
  | { ok: true; lightMaskedBody: string; flaggedCategory: string }
  | { ok: false; status: 404 | 410; code?: "CONTENT_UNAVAILABLE"; error: string };

/** Light-masked held text for a linked guardian. Audited on every call. */
export async function viewHeldMessageForGuardian(
  guardianUserId: string,
  alertId: string,
): Promise<ViewHeldMessageResult> {
  const row = await loadAlertForGuardian(guardianUserId, alertId);
  if (!row?.holdId) return { ok: false, status: 404, error: "Alert not found." };

  const hold = await prisma.dmModerationHold.findUnique({
    where: { id: row.holdId },
    select: { id: true, body: true, bodyPurgedAt: true, category: true, senderUserId: true },
  });
  if (!hold) return { ok: false, status: 404, error: "Alert not found." };
  if (hold.bodyPurgedAt || hold.body == null) {
    return {
      ok: false,
      status: 410,
      code: "CONTENT_UNAVAILABLE",
      error: "This message is no longer available.",
    };
  }

  await recordSafetyAudit({
    action: SAFETY_AUDIT_ACTIONS.CONTENT_VIEWED,
    actorUserId: guardianUserId,
    childUserId: row.childUserId,
    subjectUserId: hold.senderUserId,
    holdId: hold.id,
    alertId: row.id,
  });

  return {
    ok: true,
    lightMaskedBody: lightMaskDmText(hold.body),
    flaggedCategory: guardianCategoryLabel(hold.category),
  };
}

export type AlertActionResult =
  | { ok: true; status?: string }
  | { ok: false; status: number; error: string; code?: string; alertStatus?: string };

export async function applySafetyAlertAction(
  guardianUserId: string,
  alertId: string,
  action: "acknowledge" | "allow" | "reject" | "block",
): Promise<AlertActionResult> {
  if (typeof prisma.guardianSafetyAlert?.updateMany !== "function") {
    return { ok: false, status: 503, error: "Safety alerts are not ready." };
  }

  const row = await loadAlertForGuardian(guardianUserId, alertId);
  if (!row) return { ok: false, status: 404, error: "Alert not found." };

  const invalidState = (): AlertActionResult => ({
    ok: false,
    status: 409,
    code: "INVALID_ALERT_STATE",
    error: "This alert can't be updated in its current state.",
    alertStatus: row.status,
  });

  if (action === "acknowledge") {
    if (row.status !== "AWAITING_ACKNOWLEDGEMENT") return invalidState();
    const now = new Date();
    const result = await prisma.guardianSafetyAlert.updateMany({
      where: { id: row.id, status: "AWAITING_ACKNOWLEDGEMENT" },
      data: { status: "ACKNOWLEDGED", acknowledgedAt: now, resolvedAt: now, resolvedByUserId: guardianUserId },
    });
    if (result.count === 0) return invalidState();
    await recordSafetyAuditSafe({
      action: SAFETY_AUDIT_ACTIONS.ALERT_ACKNOWLEDGED,
      actorUserId: guardianUserId,
      childUserId: row.childUserId,
      subjectUserId: row.peerUserId,
      holdId: row.holdId,
      alertId: row.id,
    });
    return { ok: true, status: "ACKNOWLEDGED" };
  }

  if (action === "allow" || action === "reject") {
    if (!row.holdId) return invalidState();
    if (row.status !== "AWAITING_DECISION" && row.hold?.status === "PENDING") return invalidState();
    const result = await decideDmHold(row.holdId, guardianUserId, action);
    if (!result.ok) {
      return result.status === 409
        ? { ok: false, status: 409, code: result.code, error: result.error, alertStatus: result.holdStatus }
        : { ok: false, status: 404, error: result.error };
    }
    return { ok: true, status: result.status };
  }

  // block
  if (!row.peerUserId) return { ok: false, status: 400, error: "There is no contact to block." };
  const childThreadId = row.holdId
    ? await ensureRecipientThreadForHold(row.holdId)
    : await childThreadIdForAlert(row);
  if (!childThreadId) {
    return { ok: false, status: 409, error: "This contact can't be blocked from here yet." };
  }
  const settings = await upsertDmContactControlsForGuardian({
    guardianUserId,
    childUserId: row.childUserId,
    childThreadId,
    settings: { blocked: true },
  });
  if (!settings) return { ok: false, status: 404, error: "Alert not found." };
  return { ok: true, status: "BLOCKED" };
}

export async function reportFromSafetyAlert(
  guardianUserId: string,
  alertId: string,
  input: { reason: GuardianReportReason; details: string | null },
) {
  const row = await loadAlertForGuardian(guardianUserId, alertId);
  if (!row) return { ok: false as const, status: 404, error: "Alert not found." };
  if (!row.peerUserId) return { ok: false as const, status: 400, error: "There is no contact to report." };

  const details = input.details?.trim().slice(0, REPORT_DETAILS_MAX_LENGTH) || null;
  const zone = row.hold?.recipientZone ?? resolvePolicyAgeZone(row.child).zone;
  const mandatoryReportCandidate =
    (zone === "KIDS" || zone === "TEENS") &&
    (input.reason === "sexual_content" || input.reason === "grooming_concern");

  const { report, created } = await createGuardianSafetyReport({
    reporterUserId: guardianUserId,
    subjectUserId: row.peerUserId,
    childUserId: row.childUserId,
    alertId: row.id,
    holdId: row.holdId,
    reason: input.reason,
    details,
    mandatoryReportCandidate,
  });

  return { ok: true as const, reportId: report.id, created };
}

function dayLabelFor(date: Date) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfThat = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfThat.getTime()) / 86_400_000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "Earlier this week";
  if (diffDays < 14) return "Last week";
  return "Earlier";
}

const GUARDIAN_VISIBLE_AUDIT_ACTIONS = [
  SAFETY_AUDIT_ACTIONS.ALERT_RAISED,
  SAFETY_AUDIT_ACTIONS.CONTENT_VIEWED,
  SAFETY_AUDIT_ACTIONS.ALERT_ACKNOWLEDGED,
  SAFETY_AUDIT_ACTIONS.HOLD_ALLOWED,
  SAFETY_AUDIT_ACTIONS.HOLD_REJECTED,
  SAFETY_AUDIT_ACTIONS.HOLD_EXPIRED,
  SAFETY_AUDIT_ACTIONS.SENDER_BLOCKED,
  SAFETY_AUDIT_ACTIONS.CONTROLS_CHANGED,
  SAFETY_AUDIT_ACTIONS.REPORT_SUBMITTED,
  SAFETY_AUDIT_ACTIONS.TRUST_BAND_ASSIGNED,
];

function metadataRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Family Circle activity entries built from the safety audit trail (plus pre-audit legacy alerts). */
export async function listSafetyActivityItemsForGuardian(
  guardianUserId: string,
): Promise<import("@/lib/guardian/family-center-static").FamilyActivityItem[]> {
  try {
    if (typeof prisma.safetyAuditEvent?.findMany !== "function") return [];
    const childIds = await guardianChildIds(guardianUserId);
    if (childIds.length === 0) return [];

    const events = await prisma.safetyAuditEvent.findMany({
      where: { childUserId: { in: childIds }, action: { in: GUARDIAN_VISIBLE_AUDIT_ACTIONS } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const visible = events.filter((event) => {
      const meta = metadataRecord(event.metadata);
      if (event.action === SAFETY_AUDIT_ACTIONS.ALERT_RAISED) {
        return !meta.guardianUserId || meta.guardianUserId === guardianUserId;
      }
      if (event.action === SAFETY_AUDIT_ACTIONS.REPORT_SUBMITTED) return meta.source === "guardian";
      return true;
    });

    const auditedAlertIds = new Set(
      events.map((event) => event.alertId).filter((id): id is string => Boolean(id)),
    );
    const legacyAlerts = await prisma.guardianSafetyAlert.findMany({
      where: {
        guardianUserId,
        holdId: null,
        ...(auditedAlertIds.size > 0 ? { id: { notIn: [...auditedAlertIds] } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { child: { select: SAFETY_DISPLAY_USER_SELECT } },
    });

    const userIds = new Set<string>(childIds);
    for (const event of visible) {
      if (event.actorUserId) userIds.add(event.actorUserId);
      if (event.subjectUserId) userIds.add(event.subjectUserId);
    }
    const users = await prisma.user.findMany({
      where: { id: { in: [...userIds] } },
      select: SAFETY_DISPLAY_USER_SELECT,
    });
    const usersById = new Map(users.map((user) => [user.id, user]));

    const nameOf = (id: string | null) => (id ? safetyUserDisplayName(usersById.get(id)) : "Someone");
    const guardianName = (id: string | null) => (id === guardianUserId ? "You" : nameOf(id));

    const items = visible.map((event) => {
      const meta = metadataRecord(event.metadata);
      const child = event.childUserId ? usersById.get(event.childUserId) : undefined;
      const childName = safetyUserDisplayName(child);
      const childFirst = safetyUserFirstName(child);
      const counterpart = nameOf(event.subjectUserId);
      const actor = guardianName(event.actorUserId);

      let title = "Safety update";
      let detail = "";
      switch (event.action) {
        case SAFETY_AUDIT_ACTIONS.ALERT_RAISED:
          title = "Safety alert raised";
          detail =
            meta.kind === "hold"
              ? `Blocked DM to ${childFirst} from ${counterpart}.`
              : meta.kind === "informational"
                ? `A message from ${childFirst} was flagged and held for a safety review.`
                : `A message to ${childFirst} from ${counterpart} was flagged and shown masked.`;
          break;
        case SAFETY_AUDIT_ACTIONS.CONTENT_VIEWED:
          title = "Flagged message viewed";
          detail = `${actor} viewed the flagged message.`;
          break;
        case SAFETY_AUDIT_ACTIONS.ALERT_ACKNOWLEDGED:
          title = "Safety alert acknowledged";
          detail = `${actor} acknowledged the alert.`;
          break;
        case SAFETY_AUDIT_ACTIONS.HOLD_ALLOWED:
          title = "Message allowed";
          detail = `${actor} delivered a held message from ${counterpart}.`;
          break;
        case SAFETY_AUDIT_ACTIONS.HOLD_REJECTED:
          title = "Message rejected";
          detail = `${actor} rejected a held message from ${counterpart}.`;
          break;
        case SAFETY_AUDIT_ACTIONS.HOLD_EXPIRED:
          title = "Message expired";
          detail = `A held message from ${counterpart} was not reviewed in 7 days and was not delivered.`;
          break;
        case SAFETY_AUDIT_ACTIONS.SENDER_BLOCKED:
          title = "Contact blocked";
          detail = `${actor} blocked ${counterpart}.`;
          break;
        case SAFETY_AUDIT_ACTIONS.CONTROLS_CHANGED:
          title = "DM settings changed";
          detail = `${actor} updated messaging settings for ${counterpart}.`;
          break;
        case SAFETY_AUDIT_ACTIONS.REPORT_SUBMITTED:
          title = "Reported to INRCLIQ";
          detail = `${actor} reported ${counterpart}.`;
          break;
        case SAFETY_AUDIT_ACTIONS.TRUST_BAND_ASSIGNED:
          title = "Added to Safe Contact Circle";
          detail = `${counterpart} added to Approved friends & adults.`;
          break;
      }

      return {
        id: `safety-audit-${event.id}`,
        childId: event.childUserId,
        type: "safety" as const,
        childName,
        title,
        detail,
        timeAgo: formatTimeAgo(event.createdAt),
        dayLabel: dayLabelFor(event.createdAt),
        createdAt: event.createdAt,
      };
    });

    const legacyItems = legacyAlerts.map((row) => {
      const acknowledged = row.status === "ACKNOWLEDGED";
      return {
        id: `safety-alert-${row.id}`,
        childId: row.childUserId,
        type: "safety" as const,
        childName: safetyUserDisplayName(row.child),
        title: acknowledged ? "Safety alert acknowledged" : "Safety alert raised",
        detail: acknowledged
          ? `You reviewed a ${row.category.toLowerCase()} alert. ${row.actionTaken}`
          : `${row.category} detected. ${row.actionTaken}`,
        timeAgo: formatTimeAgo(row.createdAt),
        dayLabel: dayLabelFor(row.createdAt),
        createdAt: row.createdAt,
      };
    });

    return [...items, ...legacyItems]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((item) => ({
        id: item.id,
        childId: item.childId,
        type: item.type,
        childName: item.childName,
        title: item.title,
        detail: item.detail,
        timeAgo: item.timeAgo,
        dayLabel: item.dayLabel,
      }));
  } catch (error) {
    if (isMissingAlertModel(error)) return [];
    console.error("listSafetyActivityItemsForGuardian failed", error);
    return [];
  }
}

export async function countUnresolvedSafetyAlerts(guardianUserId: string) {
  try {
    if (typeof prisma.guardianSafetyAlert?.count !== "function") return 0;
    await expireHoldsForGuardian(guardianUserId);
    return prisma.guardianSafetyAlert.count({
      where: { guardianUserId, status: { in: UNRESOLVED_ALERT_STATUSES } },
    });
  } catch (error) {
    if (isMissingAlertModel(error)) return 0;
    console.error("countUnresolvedSafetyAlerts failed", error);
    return 0;
  }
}

/** Kept for existing callers; prefer `applySafetyAlertAction`. */
export async function acknowledgeSafetyAlert(guardianUserId: string, alertId: string) {
  return applySafetyAlertAction(guardianUserId, alertId, "acknowledge");
}