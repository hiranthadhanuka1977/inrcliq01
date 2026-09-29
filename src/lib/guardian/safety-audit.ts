import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const SAFETY_AUDIT_ACTIONS = {
  HOLD_CREATED: "HOLD_CREATED",
  ALERT_RAISED: "ALERT_RAISED",
  CONTENT_VIEWED: "CONTENT_VIEWED",
  ALERT_ACKNOWLEDGED: "ALERT_ACKNOWLEDGED",
  HOLD_ALLOWED: "HOLD_ALLOWED",
  HOLD_REJECTED: "HOLD_REJECTED",
  HOLD_EXPIRED: "HOLD_EXPIRED",
  SENDER_BLOCKED: "SENDER_BLOCKED",
  CONTROLS_CHANGED: "CONTROLS_CHANGED",
  REPORT_SUBMITTED: "REPORT_SUBMITTED",
  STRIKE_RECORDED: "STRIKE_RECORDED",
  STRIKE_VOIDED: "STRIKE_VOIDED",
  RESTRICTION_APPLIED: "RESTRICTION_APPLIED",
  REVIEW_ESCALATED: "REVIEW_ESCALATED",
  TRUST_BAND_ASSIGNED: "TRUST_BAND_ASSIGNED",
} as const;

export type SafetyAuditAction = (typeof SAFETY_AUDIT_ACTIONS)[keyof typeof SAFETY_AUDIT_ACTIONS];

export type SafetyAuditInput = {
  action: SafetyAuditAction;
  actorUserId?: string | null;
  childUserId?: string | null;
  subjectUserId?: string | null;
  holdId?: string | null;
  alertId?: string | null;
  /** Never put message text in metadata. */
  metadata?: Prisma.InputJsonValue;
};

type AuditClient = Pick<Prisma.TransactionClient, "safetyAuditEvent">;

export async function recordSafetyAudit(input: SafetyAuditInput, db: AuditClient = prisma) {
  await db.safetyAuditEvent.create({
    data: {
      action: input.action,
      actorUserId: input.actorUserId ?? null,
      childUserId: input.childUserId ?? null,
      subjectUserId: input.subjectUserId ?? null,
      holdId: input.holdId ?? null,
      alertId: input.alertId ?? null,
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    },
  });
}

/** Best-effort audit outside a transaction; never throws. */
export async function recordSafetyAuditSafe(input: SafetyAuditInput) {
  try {
    await recordSafetyAudit(input);
  } catch (error) {
    console.error("recordSafetyAudit failed", input.action, error);
  }
}
