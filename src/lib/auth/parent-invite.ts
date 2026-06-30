import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { ApprovalStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/api-helpers";
import {
  PARENT_INVITE_COOLDOWN_SECONDS,
  PARENT_INVITE_EXPIRY_HOURS,
} from "@/lib/auth/parent-invite.constants";

function generateToken() {
  return randomBytes(32).toString("hex");
}

export async function getParentInviteCooldownRemaining(childUserId: string) {
  const latest = await prisma.parentApprovalRequest.findFirst({
    where: { childUserId },
    orderBy: { createdAt: "desc" },
  });

  if (!latest) return 0;

  const cooldownEndsAt = latest.createdAt.getTime() + PARENT_INVITE_COOLDOWN_SECONDS * 1000;
  const remaining = Math.ceil((cooldownEndsAt - Date.now()) / 1000);

  return remaining > 0 ? remaining : 0;
}

export async function createParentApprovalRequest(childUserId: string, parentEmail: string) {
  const normalizedParentEmail = parentEmail.toLowerCase();
  const remaining = await getParentInviteCooldownRemaining(childUserId);

  if (remaining > 0) {
    return { ok: false as const, cooldownRemaining: remaining };
  }

  const rawToken = generateToken();
  const tokenHash = await bcrypt.hash(rawToken, 10);
  const expiresAt = new Date(Date.now() + PARENT_INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

  await prisma.parentApprovalRequest.updateMany({
    where: { childUserId, status: ApprovalStatus.PENDING },
    data: { status: ApprovalStatus.EXPIRED, resolvedAt: new Date() },
  });

  const request = await prisma.parentApprovalRequest.create({
    data: {
      childUserId,
      parentEmail: normalizedParentEmail,
      tokenHash,
      expiresAt,
    },
  });

  const approveUrl = `${getAppUrl()}/guardian/approve?token=${rawToken}`;

  return {
    ok: true as const,
    request,
    approveUrl,
    rawToken,
    cooldownRemaining: PARENT_INVITE_COOLDOWN_SECONDS,
  };
}

export async function verifyParentApprovalToken(rawToken: string) {
  const requests = await prisma.parentApprovalRequest.findMany({
    where: {
      status: ApprovalStatus.PENDING,
      expiresAt: { gt: new Date() },
    },
    include: { childUser: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  for (const record of requests) {
    const matches = await bcrypt.compare(rawToken, record.tokenHash);
    if (!matches) continue;

    return { ok: true as const, request: record };
  }

  return { ok: false as const, reason: "invalid" as const };
}

export async function unlockChildAfterParentApproval(childUserId: string) {
  await prisma.user.update({
    where: { id: childUserId },
    data: { onboardingStep: "approved" },
  });
}

export async function approveParentRequest(requestId: string) {
  const request = await prisma.parentApprovalRequest.findUniqueOrThrow({
    where: { id: requestId },
  });

  await prisma.$transaction([
    prisma.parentApprovalRequest.update({
      where: { id: requestId },
      data: {
        status: ApprovalStatus.APPROVED,
        resolvedAt: new Date(),
      },
    }),
    prisma.user.update({
      where: { id: request.childUserId },
      data: { onboardingStep: "approved" },
    }),
  ]);

  return request;
}

export async function getLatestParentRequest(childUserId: string) {
  return prisma.parentApprovalRequest.findFirst({
    where: { childUserId },
    orderBy: { createdAt: "desc" },
  });
}

export async function sendParentInviteEmail(
  parentEmail: string,
  approveUrl: string,
  childFirstName: string,
) {
  console.info(
    `[email] Parent invite for ${parentEmail} (${childFirstName}): ${approveUrl}`,
  );
}
