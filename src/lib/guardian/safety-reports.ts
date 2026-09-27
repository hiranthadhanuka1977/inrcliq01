import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { recordSafetyAudit, SAFETY_AUDIT_ACTIONS } from "@/lib/guardian/safety-audit";

export const GUARDIAN_REPORT_REASONS = [
  "sexual_content",
  "grooming_concern",
  "harassment",
  "other",
] as const;

export type GuardianReportReason = (typeof GUARDIAN_REPORT_REASONS)[number];

export const REPORT_DETAILS_MAX_LENGTH = 1000;

export function isGuardianReportReason(value: unknown): value is GuardianReportReason {
  return typeof value === "string" && (GUARDIAN_REPORT_REASONS as readonly string[]).includes(value);
}

type ReportClient = Pick<Prisma.TransactionClient, "safetyReport" | "safetyAuditEvent">;

export async function createSystemSafetyReport(
  input: {
    subjectUserId: string;
    reason: "sexual_content_to_minor" | "repeat_offender";
    holdId?: string | null;
    childUserId?: string | null;
    mandatoryReportCandidate?: boolean;
    /** Reuse an open system report for the same subject + reason created after this time. */
    dedupeSince?: Date;
  },
  db: ReportClient = prisma,
) {
  if (input.dedupeSince) {
    const existing = await db.safetyReport.findFirst({
      where: {
        subjectUserId: input.subjectUserId,
        source: "system",
        reason: input.reason,
        holdId: input.holdId ?? null,
        status: { in: ["OPEN", "IN_REVIEW"] },
        createdAt: { gte: input.dedupeSince },
      },
      select: { id: true },
    });
    if (existing) return existing;
  }

  const report = await db.safetyReport.create({
    data: {
      reporterUserId: null,
      subjectUserId: input.subjectUserId,
      holdId: input.holdId ?? null,
      source: "system",
      reason: input.reason,
      priority: "urgent",
      mandatoryReportCandidate: input.mandatoryReportCandidate ?? false,
    },
    select: { id: true },
  });

  await recordSafetyAudit(
    {
      action: SAFETY_AUDIT_ACTIONS.REPORT_SUBMITTED,
      actorUserId: null,
      childUserId: input.childUserId ?? null,
      subjectUserId: input.subjectUserId,
      holdId: input.holdId ?? null,
      metadata: { source: "system", reason: input.reason, reportId: report.id },
    },
    db,
  );

  return report;
}

/**
 * Guardian report from a safety alert. One report per (guardian, alert); repeats return the
 * existing report.
 */
export async function createGuardianSafetyReport(input: {
  reporterUserId: string;
  subjectUserId: string;
  childUserId: string;
  alertId: string;
  holdId: string | null;
  reason: GuardianReportReason;
  details: string | null;
  mandatoryReportCandidate: boolean;
}) {
  const existing = await prisma.safetyReport.findFirst({
    where: { reporterUserId: input.reporterUserId, alertId: input.alertId, source: "guardian" },
    select: { id: true, status: true, createdAt: true },
  });
  if (existing) return { report: existing, created: false as const };

  const report = await prisma.$transaction(async (tx) => {
    const created = await tx.safetyReport.create({
      data: {
        reporterUserId: input.reporterUserId,
        subjectUserId: input.subjectUserId,
        holdId: input.holdId,
        alertId: input.alertId,
        source: "guardian",
        reason: input.reason,
        details: input.details,
        priority: input.mandatoryReportCandidate ? "urgent" : "normal",
        mandatoryReportCandidate: input.mandatoryReportCandidate,
      },
      select: { id: true, status: true, createdAt: true },
    });
    await recordSafetyAudit(
      {
        action: SAFETY_AUDIT_ACTIONS.REPORT_SUBMITTED,
        actorUserId: input.reporterUserId,
        childUserId: input.childUserId,
        subjectUserId: input.subjectUserId,
        holdId: input.holdId,
        alertId: input.alertId,
        metadata: { source: "guardian", reason: input.reason, reportId: created.id },
      },
      tx,
    );
    return created;
  });

  return { report, created: true as const };
}
