import { ApprovalStatus } from "@/generated/prisma/client";
import { listAdminAudit } from "@/lib/admin-portal/audit";
import { listAdminGuardians } from "@/lib/admin-portal/lists";
import { listAdminUsers } from "@/lib/admin-portal/queue";
import { STEP_LABELS, type StuckReason } from "@/lib/admin-portal/stuck";
import { prisma } from "@/lib/prisma";

const TREND_DAYS = 14;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const MINOR_FUNNEL_STEPS = [
  "parent",
  "waiting",
  "approved",
  "password",
  "handle",
  "interests",
  "complete",
] as const;

const NEEDS_HELP: StuckReason[] = ["invite_expired", "declined", "continue_expired"];
const ATTENTION_ORDER: StuckReason[] = [
  "continue_expired",
  "invite_expired",
  "declined",
  "suspended",
  "approved_waiting",
  "needs_guardian_email",
  "email_unverified",
  "invite_open",
  "setup_incomplete",
];

export async function getAdminDashboard() {
  const now = new Date();
  const [directory, queue, approvalGroups, revoked, openInvites, guardians, audit] = await Promise.all([
    listAdminUsers("directory", {}, { unpaged: true }),
    listAdminUsers("queue", {}, { unpaged: true }),
    prisma.parentApprovalRequest.groupBy({
      by: ["status"],
      where: { revokedAt: null },
      _count: { _all: true },
    }),
    prisma.parentApprovalRequest.count({ where: { revokedAt: { not: null } } }),
    prisma.parentApprovalRequest.count({
      where: { status: ApprovalStatus.PENDING, expiresAt: { gt: now }, revokedAt: null },
    }),
    listAdminGuardians(),
    listAdminAudit({ take: 8 }),
  ]);

  const users = directory.rows;
  const byType = { ADULT: 0, MINOR: 0, GUARDIAN: 0 };
  for (const user of users) byType[user.accountType] += 1;

  const newLast7Days = users.filter((user) => now.getTime() - user.createdAt.getTime() <= WEEK_MS).length;
  const inProgress = users.filter((user) => user.onboardingStep !== "complete").length;
  const suspended = directory.counts.suspended;
  const minorsNeedingHelp = NEEDS_HELP.reduce((sum, reason) => sum + queue.counts[reason], 0);

  const minors = users.filter((user) => user.accountType === "MINOR");
  const funnel = [
    {
      key: "unverified",
      label: "Email not verified",
      count: minors.filter((user) => user.stuck === "email_unverified").length,
      href: "/admin/queue?accountType=MINOR&stuck=email_unverified",
    },
    ...MINOR_FUNNEL_STEPS.map((step) => ({
      key: step,
      label: STEP_LABELS[step] ?? step,
      count: minors.filter((user) => user.onboardingStep === step && user.stuck !== "email_unverified").length,
      href: `/admin/users?accountType=MINOR&step=${step}`,
    })),
  ];

  const approvalCount = (status: ApprovalStatus) =>
    approvalGroups.find((row) => row.status === status)?._count._all ?? 0;
  const approvals = [
    { key: "PENDING", label: "Pending, link open", count: openInvites, href: "/admin/queue?stuck=invite_open" },
    {
      key: "PENDING_LAPSED",
      label: "Pending, link expired",
      count: approvalCount(ApprovalStatus.PENDING) - openInvites,
      href: "/admin/queue?stuck=invite_expired",
    },
    { key: "APPROVED", label: "Approved", count: approvalCount(ApprovalStatus.APPROVED), href: "/admin/consent" },
    { key: "DECLINED", label: "Declined", count: approvalCount(ApprovalStatus.DECLINED), href: "/admin/queue?stuck=declined" },
    { key: "EXPIRED", label: "Expired", count: approvalCount(ApprovalStatus.EXPIRED), href: "/admin/queue?stuck=invite_expired" },
    { key: "REVOKED", label: "Revoked by operator", count: revoked, href: "/admin/audit" },
  ];

  const identity = {
    accepted: guardians.filter((guardian) => guardian.identity === "Accepted").length,
    rejected: guardians.filter((guardian) => guardian.identity === "Rejected").length,
    notReviewed: guardians.filter((guardian) => guardian.identity === "Not reviewed").length,
    unfinished: guardians.filter((guardian) => guardian.setup !== "Completed").length,
    total: guardians.length,
  };

  const attention = queue.rows
    .filter((row) => row.stuck && row.stuck !== "recent_complete")
    .sort((a, b) => {
      const rank = ATTENTION_ORDER.indexOf(a.stuck!) - ATTENTION_ORDER.indexOf(b.stuck!);
      return rank !== 0 ? rank : a.createdAt.getTime() - b.createdAt.getTime();
    });

  return {
    totals: { all: users.length, ...byType },
    newLast7Days,
    inProgress,
    minorsNeedingHelp,
    openInvites,
    suspended,
    trend: buildTrend(users.map((user) => user.createdAt), now),
    funnel,
    approvals,
    identity,
    attention: attention.slice(0, 8),
    attentionTotal: attention.length,
    queueCounts: queue.counts,
    audit: audit.map((entry) => ({
      id: entry.id,
      createdAt: entry.createdAt,
      action: entry.action,
      reason: entry.reason,
      userId: entry.targetUser?.id ?? null,
      userLabel: entry.targetUser?.email ?? "Deleted account",
    })),
  };
}

function buildTrend(createdAt: Date[], now: Date) {
  const days: Array<{ day: string; count: number }> = [];
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  for (let offset = TREND_DAYS - 1; offset >= 0; offset -= 1) {
    days.push({ day: new Date(today - offset * 86_400_000).toISOString().slice(0, 10), count: 0 });
  }
  const index = new Map(days.map((entry, position) => [entry.day, position]));
  for (const date of createdAt) {
    const position = index.get(date.toISOString().slice(0, 10));
    if (position !== undefined) days[position].count += 1;
  }
  return days;
}

export type AdminDashboard = Awaited<ReturnType<typeof getAdminDashboard>>;
