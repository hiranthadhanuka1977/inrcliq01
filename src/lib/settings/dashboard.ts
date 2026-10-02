import type { AccountType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AGE_ZONE_LABELS, type AgeZoneCode } from "@/lib/utils/age-zone";
import {
  AI_USER_SIGNUP_METHOD,
  DEMO_SEED_SIGNUP_METHOD,
  DEMO_SIGNUP_METHOD,
  USER_GROUP_WHERE,
  formatUserName,
  formatUserType,
  type SettingsUserRow,
} from "@/lib/settings/users";

const TREND_DAYS = 14;
const DAY_MS = 86_400_000;

export type SummarySegment = {
  key: string;
  label: string;
  count: number;
};

export type SettingsUserSummary = {
  total: number;
  realSignups: number;
  demoAccounts: number;
  aiAccounts: number;
  newLast7Days: number;
  newLast30Days: number;
  signedInNow: number;
  emailVerified: number;
  accountTypes: SummarySegment[];
  ageZones: (SummarySegment & { zone: AgeZoneCode })[];
  onboardingComplete: number;
  onboardingSteps: SummarySegment[];
  signupMethods: SummarySegment[];
  parentApprovals: SummarySegment[];
  guardianChildLinks: number;
  dailySignups: { date: string; label: string; count: number }[];
  recentUsers: Omit<SettingsUserRow, "postCount" | "handle">[];
};

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  ADULT: "Adults",
  MINOR: "Under-18 accounts",
  GUARDIAN: "Parents / guardians",
};

export const ONBOARDING_STEP_LABELS: Record<string, string> = {
  "guardian-setup": "Parent setting up account",
  waiting: "Waiting for parent approval",
  approved: "Approved, finishing setup",
  password: "Setting a password",
  handle: "Choosing a handle",
  interests: "Choosing interests",
};

export const SIGNUP_METHOD_LABELS: Record<string, string> = {
  email: "Email",
  google: "Google",
  [DEMO_SIGNUP_METHOD]: "Seeded creator accounts",
  [DEMO_SEED_SIGNUP_METHOD]: "Demo accounts",
  [AI_USER_SIGNUP_METHOD]: "AI users",
};

export const APPROVAL_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  DECLINED: "Declined",
  EXPIRED: "Expired",
};

const AGE_ZONE_ORDER: AgeZoneCode[] = ["KIDS", "TEENS", "MATURE_TEENS", "ADULT"];

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Start (00:00 UTC) of a trailing window of `days` UTC days ending today. */
export function trendWindowStart(days = TREND_DAYS) {
  const start = new Date(Date.now() - (days - 1) * DAY_MS);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

/** Count dates per UTC day across the window, including empty days. */
export function buildDailyCounts(dates: Date[], start: Date, days = TREND_DAYS) {
  const perDay = new Map<string, number>();
  for (const date of dates) {
    const key = dateKey(date);
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(start.getTime() + index * DAY_MS);
    const key = dateKey(day);
    return {
      date: key,
      label: day.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
      count: perDay.get(key) ?? 0,
    };
  });
}

function byCountDesc(a: SummarySegment, b: SummarySegment) {
  return b.count - a.count;
}

export async function getSettingsUserSummary(): Promise<SettingsUserSummary> {
  const now = Date.now();
  const trendStart = trendWindowStart();

  const [
    total,
    demoAccounts,
    aiAccounts,
    newLast7Days,
    newLast30Days,
    emailVerified,
    activeSessions,
    typeRows,
    zoneRows,
    stepRows,
    methodRows,
    approvalRows,
    guardianChildLinks,
    trendRows,
    recent,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: USER_GROUP_WHERE.demo }),
    prisma.user.count({ where: USER_GROUP_WHERE.ai }),
    prisma.user.count({ where: { createdAt: { gte: new Date(now - 7 * DAY_MS) } } }),
    prisma.user.count({ where: { createdAt: { gte: new Date(now - 30 * DAY_MS) } } }),
    prisma.user.count({ where: { emailVerified: { not: null } } }),
    prisma.session.findMany({
      where: { expires: { gt: new Date(now) } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.user.groupBy({ by: ["accountType"], _count: { _all: true } }),
    prisma.user.groupBy({ by: ["ageZone", "accountType"], _count: { _all: true } }),
    prisma.user.groupBy({ by: ["onboardingStep"], _count: { _all: true } }),
    prisma.user.groupBy({ by: ["signupMethod"], _count: { _all: true } }),
    prisma.parentApprovalRequest.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.guardianChildLink.count(),
    prisma.user.findMany({ where: { createdAt: { gte: trendStart } }, select: { createdAt: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, email: true, firstName: true, lastName: true, accountType: true, createdAt: true },
    }),
  ]);

  const accountTypes = (Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((type) => ({
    key: type,
    label: ACCOUNT_TYPE_LABELS[type],
    count: typeRows.find((row) => row.accountType === type)?._count._all ?? 0,
  }));

  // Same fallback as the DM policy: no cached zone means Kids for minors, Adult otherwise.
  const zoneCounts = new Map<AgeZoneCode, number>();
  for (const row of zoneRows) {
    const zone: AgeZoneCode = row.ageZone ?? (row.accountType === "MINOR" ? "KIDS" : "ADULT");
    zoneCounts.set(zone, (zoneCounts.get(zone) ?? 0) + row._count._all);
  }
  const ageZones = AGE_ZONE_ORDER.map((zone) => ({
    key: zone,
    zone,
    label: AGE_ZONE_LABELS[zone],
    count: zoneCounts.get(zone) ?? 0,
  }));

  let onboardingComplete = 0;
  const onboardingSteps: SummarySegment[] = [];
  for (const row of stepRows) {
    if (row.onboardingStep === "complete") {
      onboardingComplete += row._count._all;
      continue;
    }
    const key = row.onboardingStep ?? "not-started";
    onboardingSteps.push({
      key,
      label: row.onboardingStep ? (ONBOARDING_STEP_LABELS[row.onboardingStep] ?? row.onboardingStep) : "Not started",
      count: row._count._all,
    });
  }
  onboardingSteps.sort(byCountDesc);

  const signupMethods = methodRows
    .map((row) => ({
      key: row.signupMethod ?? "unknown",
      label: row.signupMethod ? (SIGNUP_METHOD_LABELS[row.signupMethod] ?? row.signupMethod) : "Not recorded",
      count: row._count._all,
    }))
    .sort(byCountDesc);

  const parentApprovals = Object.keys(APPROVAL_STATUS_LABELS).map((status) => ({
    key: status,
    label: APPROVAL_STATUS_LABELS[status],
    count: approvalRows.find((row) => row.status === status)?._count._all ?? 0,
  }));

  const dailySignups = buildDailyCounts(
    trendRows.map((row) => row.createdAt),
    trendStart,
  );

  return {
    total,
    realSignups: total - demoAccounts - aiAccounts,
    demoAccounts,
    aiAccounts,
    newLast7Days,
    newLast30Days,
    signedInNow: activeSessions.length,
    emailVerified,
    accountTypes,
    ageZones,
    onboardingComplete,
    onboardingSteps,
    signupMethods,
    parentApprovals,
    guardianChildLinks,
    dailySignups,
    recentUsers: recent.map((user) => ({
      id: user.id,
      email: user.email,
      name: formatUserName(user.firstName, user.lastName),
      typeLabel: formatUserType(user.accountType),
      accountType: user.accountType,
      createdAt: user.createdAt,
    })),
  };
}
