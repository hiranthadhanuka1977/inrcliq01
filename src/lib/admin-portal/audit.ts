import type { Prisma } from "@/generated/prisma/client";
import { ADMIN_ACTOR } from "@/lib/admin-portal/access";
import { prisma } from "@/lib/prisma";

export async function writeAdminAudit(entry: {
  action: string;
  targetUserId?: string | null;
  reason: string;
  before?: unknown;
  after?: unknown;
}) {
  await prisma.adminAuditLog.create({
    data: {
      actor: ADMIN_ACTOR,
      action: entry.action,
      targetUserId: entry.targetUserId ?? null,
      reason: entry.reason.trim(),
      before: toJson(entry.before),
      after: toJson(entry.after),
    },
  });
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function listAdminAudit(options?: { targetUserId?: string; take?: number }) {
  return prisma.adminAuditLog.findMany({
    where: options?.targetUserId ? { targetUserId: options.targetUserId } : undefined,
    orderBy: { createdAt: "desc" },
    take: options?.take ?? 200,
    include: {
      targetUser: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
  });
}
