import type { Prisma } from "@/generated/prisma/client";
import { ApprovalStatus } from "@/generated/prisma/client";
import type { ProtectionTier } from "@/lib/guardian/constants";
import { prisma } from "@/lib/prisma";

type LinkInput = {
  guardianUserId: string;
  childUserId: string;
  parentApprovalRequestId: string;
  protectionLevel?: ProtectionTier | string | null;
  linkedAt?: Date;
};

export async function linkGuardianToChild(
  input: LinkInput,
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const linkedAt = input.linkedAt ?? new Date();

  return db.guardianChildLink.upsert({
    where: {
      guardianUserId_childUserId: {
        guardianUserId: input.guardianUserId,
        childUserId: input.childUserId,
      },
    },
    create: {
      guardianUserId: input.guardianUserId,
      childUserId: input.childUserId,
      parentApprovalRequestId: input.parentApprovalRequestId,
      protectionLevel: input.protectionLevel ?? null,
      linkedAt,
    },
    update: {
      parentApprovalRequestId: input.parentApprovalRequestId,
      protectionLevel: input.protectionLevel ?? null,
      linkedAt,
    },
  });
}

/** Backfill durable links from historical approved parent requests. */
export async function backfillGuardianChildLinksFromApprovals() {
  const approved = await prisma.parentApprovalRequest.findMany({
    where: {
      status: ApprovalStatus.APPROVED,
      guardianUserId: { not: null },
    },
    select: {
      id: true,
      guardianUserId: true,
      childUserId: true,
      protectionLevel: true,
      resolvedAt: true,
    },
  });

  let linked = 0;
  for (const request of approved) {
    if (!request.guardianUserId) continue;
    await linkGuardianToChild({
      guardianUserId: request.guardianUserId,
      childUserId: request.childUserId,
      parentApprovalRequestId: request.id,
      protectionLevel: request.protectionLevel,
      linkedAt: request.resolvedAt ?? undefined,
    });
    linked += 1;
  }
  return linked;
}
