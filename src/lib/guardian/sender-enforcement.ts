import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { recordSafetyAudit, SAFETY_AUDIT_ACTIONS } from "@/lib/guardian/safety-audit";
import { createSystemSafetyReport } from "@/lib/guardian/safety-reports";

export const STRIKE_WINDOW_DAYS = 30;
export const RESTRICTION_DAYS = 7;
export const REVIEW_THRESHOLD = 3;

const DAY_MS = 86_400_000;

export type SenderEnforcement =
  | { level: "warning" }
  | { level: "restricted"; endsAt: string }
  | { level: "under_review" };

function activeRestrictionWhere(userId: string, now: Date): Prisma.UserDmRestrictionWhereInput {
  return {
    userId,
    scope: "MINORS",
    startsAt: { lte: now },
    OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    reviewStatus: { not: "CLEARED" },
  };
}

/** Active ban on messaging minors, or null. */
export async function getSenderMinorDmRestriction(userId: string) {
  try {
    if (typeof prisma.userDmRestriction?.findFirst !== "function") return null;
    return await prisma.userDmRestriction.findFirst({
      where: activeRestrictionWhere(userId, new Date()),
      orderBy: [{ endsAt: { sort: "desc", nulls: "first" } }],
      select: { id: true, endsAt: true, reviewStatus: true, reason: true },
    });
  } catch (error) {
    console.error("getSenderMinorDmRestriction failed", error);
    return null;
  }
}

export function minorRestrictionMessage(endsAt: Date | null) {
  if (!endsAt) {
    return "Your ability to message accounts under 18 is paused while our team reviews your account.";
  }
  const date = endsAt.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  return `You can't message accounts under 18 until ${date} because of repeated safety flags.`;
}

/**
 * Record a strike for an adult sender and escalate:
 * 1 strike → warning, 2 → 7-day ban on messaging minors, ≥3 → indefinite ban pending review.
 */
export async function recordStrikeAndEscalate(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    holdId: string;
    category: string;
    severity: number;
    childUserId: string;
  },
): Promise<SenderEnforcement> {
  const now = new Date();

  const strike = await tx.senderSafetyStrike.create({
    data: {
      userId: input.userId,
      holdId: input.holdId,
      category: input.category,
      severity: input.severity,
    },
    select: { id: true },
  });
  await recordSafetyAudit(
    {
      action: SAFETY_AUDIT_ACTIONS.STRIKE_RECORDED,
      childUserId: input.childUserId,
      subjectUserId: input.userId,
      holdId: input.holdId,
      metadata: { strikeId: strike.id, category: input.category, severity: input.severity },
    },
    tx,
  );

  const strikeCount = await tx.senderSafetyStrike.count({
    where: {
      userId: input.userId,
      voidedAt: null,
      createdAt: { gte: new Date(now.getTime() - STRIKE_WINDOW_DAYS * DAY_MS) },
    },
  });

  if (strikeCount >= REVIEW_THRESHOLD) {
    const active = await tx.userDmRestriction.findFirst({
      where: activeRestrictionWhere(input.userId, now),
      select: { id: true },
    });
    const restriction = active
      ? await tx.userDmRestriction.update({
          where: { id: active.id },
          data: { endsAt: null, reviewStatus: "PENDING_REVIEW", reason: "human_review" },
          select: { id: true },
        })
      : await tx.userDmRestriction.create({
          data: {
            userId: input.userId,
            reason: "human_review",
            endsAt: null,
            reviewStatus: "PENDING_REVIEW",
          },
          select: { id: true },
        });
    await createSystemSafetyReport(
      {
        subjectUserId: input.userId,
        reason: "repeat_offender",
        holdId: input.holdId,
        childUserId: input.childUserId,
      },
      tx,
    );
    await recordSafetyAudit(
      {
        action: SAFETY_AUDIT_ACTIONS.REVIEW_ESCALATED,
        childUserId: input.childUserId,
        subjectUserId: input.userId,
        holdId: input.holdId,
        metadata: { restrictionId: restriction.id, strikeCount },
      },
      tx,
    );
    return { level: "under_review" };
  }

  if (strikeCount === 2) {
    const endsAt = new Date(now.getTime() + RESTRICTION_DAYS * DAY_MS);
    const restriction = await tx.userDmRestriction.create({
      data: { userId: input.userId, reason: "repeat_strikes", endsAt },
      select: { id: true },
    });
    await recordSafetyAudit(
      {
        action: SAFETY_AUDIT_ACTIONS.RESTRICTION_APPLIED,
        childUserId: input.childUserId,
        subjectUserId: input.userId,
        holdId: input.holdId,
        metadata: { restrictionId: restriction.id, endsAt: endsAt.toISOString(), strikeCount },
      },
      tx,
    );
    return { level: "restricted", endsAt: endsAt.toISOString() };
  }

  return { level: "warning" };
}
