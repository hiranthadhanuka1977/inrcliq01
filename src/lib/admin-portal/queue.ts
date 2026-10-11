import type { AccountType, AgeZone, ApprovalStatus, Prisma } from "@/generated/prisma/client";
import {
  describeStuck,
  inQueue,
  stepLabel,
  type RequestSnapshot,
  type StuckReason,
} from "@/lib/admin-portal/stuck";
import { isAiUserSignupMethod, isDemoSignupMethod } from "@/lib/settings/users";
import { prisma } from "@/lib/prisma";
import { AGE_ZONE_LABELS, type AgeZoneCode } from "@/lib/utils/age-zone";

const PAGE_SIZE = 25;

export type AdminListFilters = {
  q?: string;
  accountType?: AccountType | "";
  ageZone?: AgeZone | "";
  step?: string;
  approval?: ApprovalStatus | "none" | "";
  stuck?: StuckReason | "";
  group?: "members" | "demo" | "ai" | "";
  page?: number;
};

export type AdminListRow = {
  id: string;
  name: string;
  email: string;
  handle: string | null;
  accountType: AccountType;
  ageZoneLabel: string;
  stepLabel: string;
  onboardingStep: string | null;
  stuck: StuckReason | null;
  detail: string;
  guardianEmail: string | null;
  approvalStatus: ApprovalStatus | null;
  createdAt: Date;
  group: "Member" | "Demo" | "AI";
};

type LoadedUser = Prisma.UserGetPayload<{
  include: {
    parentApprovalRequests: { orderBy: { createdAt: "desc" }; take: 1 };
    childGuardians: { include: { guardianUser: { select: { email: true } } } };
  };
}>;

function snapshotOf(user: LoadedUser): RequestSnapshot | null {
  const request = user.parentApprovalRequests[0];
  if (!request) return null;
  return {
    status: request.status,
    parentEmail: request.parentEmail,
    expiresAt: request.expiresAt,
    sentAt: request.sentAt,
    resolvedAt: request.resolvedAt,
    revokedAt: request.revokedAt,
    protectionLevel: request.protectionLevel,
    continueTokenExpiresAt: request.continueTokenExpiresAt,
    continueTokenUsedAt: request.continueTokenUsedAt,
    hasContinueToken: Boolean(request.continueTokenHash),
  };
}

function displayName(firstName: string | null, lastName: string | null, email: string) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || email;
}

function groupOf(signupMethod: string | null): AdminListRow["group"] {
  if (isAiUserSignupMethod(signupMethod)) return "AI";
  if (isDemoSignupMethod(signupMethod)) return "Demo";
  return "Member";
}

function toRow(user: LoadedUser, now: Date): { row: AdminListRow; includeInQueue: boolean } {
  const request = snapshotOf(user);
  const stuck = describeStuck(user, request, now);
  const row: AdminListRow = {
    id: user.id,
    name: displayName(user.firstName, user.lastName, user.email),
    email: user.email,
    handle: user.handle ? `@${user.handle.replace(/^@/, "")}` : null,
    accountType: user.accountType,
    ageZoneLabel: user.ageZone ? AGE_ZONE_LABELS[user.ageZone as AgeZoneCode] : "Not set",
    stepLabel: stepLabel(user.onboardingStep),
    onboardingStep: user.onboardingStep,
    stuck: stuck.reason,
    detail: stuck.detail,
    guardianEmail: user.childGuardians[0]?.guardianUser.email ?? request?.parentEmail ?? null,
    approvalStatus: request && !request.revokedAt ? request.status : null,
    createdAt: user.createdAt,
    group: groupOf(user.signupMethod),
  };
  return { row, includeInQueue: inQueue(user, stuck.reason, now) };
}

function matches(row: AdminListRow, filters: AdminListFilters) {
  if (filters.accountType && row.accountType !== filters.accountType) return false;
  if (filters.ageZone && row.ageZoneLabel !== AGE_ZONE_LABELS[filters.ageZone as AgeZoneCode]) return false;
  if (filters.step && (row.onboardingStep ?? "") !== filters.step) return false;
  if (filters.approval === "none" && row.approvalStatus) return false;
  if (filters.approval && filters.approval !== "none" && row.approvalStatus !== filters.approval) return false;
  if (filters.stuck && row.stuck !== filters.stuck) return false;
  if (filters.group === "members" && row.group !== "Member") return false;
  if (filters.group === "demo" && row.group !== "Demo") return false;
  if (filters.group === "ai" && row.group !== "AI") return false;
  if (filters.q) {
    const haystack = `${row.name} ${row.email} ${row.handle ?? ""}`.toLowerCase();
    if (!haystack.includes(filters.q.trim().toLowerCase())) return false;
  }
  return true;
}

async function loadUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      parentApprovalRequests: { orderBy: { createdAt: "desc" }, take: 1 },
      childGuardians: { include: { guardianUser: { select: { email: true } } }, take: 1 },
    },
  });
}

export async function listAdminUsers(
  mode: "queue" | "directory",
  filters: AdminListFilters,
  options?: { unpaged?: boolean },
) {
  const now = new Date();
  const loaded = await loadUsers();
  const entries = loaded.map((user) => toRow(user, now));
  const source = (mode === "queue" ? entries.filter((entry) => entry.includeInQueue) : entries).map(
    (entry) => entry.row,
  );
  const counts = countStuck(source);
  const filtered = source.filter((row) => matches(row, filters));
  const page = Math.max(1, filters.page ?? 1);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = options?.unpaged ? 0 : (safePage - 1) * PAGE_SIZE;
  const end = options?.unpaged ? filtered.length : start + PAGE_SIZE;

  return {
    rows: filtered.slice(start, end),
    total: filtered.length,
    page: safePage,
    pageCount,
    pageSize: PAGE_SIZE,
    counts,
  };
}

function countStuck(rows: Array<{ stuck: StuckReason | null }>) {
  const counts: Record<StuckReason, number> = {
    email_unverified: 0,
    needs_guardian_email: 0,
    invite_open: 0,
    invite_expired: 0,
    declined: 0,
    approved_waiting: 0,
    continue_expired: 0,
    setup_incomplete: 0,
    suspended: 0,
    recent_complete: 0,
  };
  for (const row of rows) {
    if (row.stuck) counts[row.stuck] += 1;
  }
  return counts;
}

export function parseAdminFilters(params: Record<string, string | undefined>): AdminListFilters {
  const accountType = params.accountType;
  const ageZone = params.ageZone;
  const approval = params.approval;
  const stuck = params.stuck;
  const group = params.group;
  const page = Number(params.page);

  return {
    q: params.q?.trim() || undefined,
    accountType:
      accountType === "ADULT" || accountType === "MINOR" || accountType === "GUARDIAN" ? accountType : "",
    ageZone:
      ageZone === "KIDS" || ageZone === "TEENS" || ageZone === "MATURE_TEENS" || ageZone === "ADULT"
        ? ageZone
        : "",
    step: params.step || "",
    approval:
      approval === "PENDING" ||
      approval === "APPROVED" ||
      approval === "DECLINED" ||
      approval === "EXPIRED" ||
      approval === "none"
        ? approval
        : "",
    stuck: stuck && isStuckReason(stuck) ? stuck : "",
    group: group === "members" || group === "demo" || group === "ai" ? group : "",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

function isStuckReason(value: string): value is StuckReason {
  return (
    value === "email_unverified" ||
    value === "needs_guardian_email" ||
    value === "invite_open" ||
    value === "invite_expired" ||
    value === "declined" ||
    value === "approved_waiting" ||
    value === "continue_expired" ||
    value === "setup_incomplete" ||
    value === "suspended" ||
    value === "recent_complete"
  );
}

export function adminQueryString(filters: AdminListFilters, overrides: Partial<AdminListFilters> = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.accountType) params.set("accountType", next.accountType);
  if (next.ageZone) params.set("ageZone", next.ageZone);
  if (next.step) params.set("step", next.step);
  if (next.approval) params.set("approval", next.approval);
  if (next.stuck) params.set("stuck", next.stuck);
  if (next.group) params.set("group", next.group);
  if (next.page && next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `?${query}` : "";
}
