import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { getAppUrl } from "@/lib/api-helpers";
import {
  EMAIL_VERIFY_COOLDOWN_SECONDS,
  EMAIL_VERIFY_EXPIRY_HOURS,
} from "@/lib/auth/email-verification.constants";
import { sendEmailChangeEmail } from "@/lib/email/notifications";
import { prisma } from "@/lib/prisma";
import { parseEmail } from "@/lib/validation";

function cooldownRemaining(createdAt: Date) {
  const endsAt = createdAt.getTime() + EMAIL_VERIFY_COOLDOWN_SECONDS * 1000;
  const remaining = Math.ceil((endsAt - Date.now()) / 1000);
  return remaining > 0 ? remaining : 0;
}

export async function requestEmailChange(userId: string, rawEmail: string) {
  const parsed = parseEmail(rawEmail);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Please enter a valid email address.",
    };
  }

  const newEmail = parsed.data.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user) return { ok: false as const, error: "User not found." };
  if (newEmail === user.email.toLowerCase()) {
    return { ok: false as const, error: "That is already your email address." };
  }

  const [userTaken, creatorTaken] = await Promise.all([
    prisma.user.findFirst({
      where: { email: { equals: newEmail, mode: "insensitive" }, NOT: { id: userId } },
      select: { id: true },
    }),
    prisma.creatorUser.findFirst({
      where: { email: { equals: newEmail, mode: "insensitive" }, NOT: { userId } },
      select: { id: true },
    }),
  ]);
  if (userTaken || creatorTaken) {
    return { ok: false as const, error: "Another account already uses that email." };
  }

  const latest = await prisma.emailChangeRequest.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const remaining = latest ? cooldownRemaining(latest.createdAt) : 0;
  if (remaining > 0) {
    return {
      ok: false as const,
      error: `Please wait ${remaining} seconds before sending another verification email.`,
      cooldownRemaining: remaining,
    };
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = await bcrypt.hash(rawToken, 10);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFY_EXPIRY_HOURS * 60 * 60 * 1000);
  const usedAt = new Date();

  await prisma.$transaction([
    prisma.emailChangeRequest.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt },
    }),
    prisma.emailChangeRequest.create({
      data: { userId, newEmail, tokenHash, expiresAt },
    }),
  ]);

  const verifyUrl = `${getAppUrl()}/api/feed/me/email/verify?token=${rawToken}`;
  await sendEmailChangeEmail(newEmail, verifyUrl);

  return { ok: true as const, email: newEmail };
}

export async function confirmEmailChange(rawToken: string) {
  const token = rawToken.trim();
  if (!token) return { ok: false as const, reason: "invalid" as const };

  const requests = await prisma.emailChangeRequest.findMany({
    where: { usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  let match: (typeof requests)[number] | null = null;
  for (const record of requests) {
    if (await bcrypt.compare(token, record.tokenHash)) {
      match = record;
      break;
    }
  }
  if (!match) return { ok: false as const, reason: "invalid" as const };
  const request = match;

  try {
    await prisma.$transaction(async (tx) => {
      const taken = await tx.user.findFirst({
        where: {
          email: { equals: request.newEmail, mode: "insensitive" },
          NOT: { id: request.userId },
        },
        select: { id: true },
      });
      if (taken) throw new Error("TAKEN");

      const user = await tx.user.findUnique({
        where: { id: request.userId },
        select: {
          email: true,
          creatorProfile: { select: { id: true, email: true } },
        },
      });
      if (!user) throw new Error("INVALID");

      const creator = user.creatorProfile;
      const syncCreator = creator != null && creator.email.toLowerCase() === user.email.toLowerCase();
      if (syncCreator && creator) {
        const creatorTaken = await tx.creatorUser.findFirst({
          where: {
            email: { equals: request.newEmail, mode: "insensitive" },
            NOT: { id: creator.id },
          },
          select: { id: true },
        });
        if (creatorTaken) throw new Error("TAKEN");
      }

      await tx.user.update({
        where: { id: request.userId },
        data: { email: request.newEmail, emailVerified: new Date() },
      });

      if (syncCreator && creator) {
        await tx.creatorUser.update({
          where: { id: creator.id },
          data: { email: request.newEmail },
        });
      }

      const usedAt = new Date();
      await tx.emailChangeRequest.update({
        where: { id: request.id },
        data: { usedAt },
      });
      await tx.emailChangeRequest.updateMany({
        where: { userId: request.userId, usedAt: null },
        data: { usedAt },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "TAKEN") {
      return { ok: false as const, reason: "taken" as const };
    }
    if (error instanceof Error && error.message === "INVALID") {
      return { ok: false as const, reason: "invalid" as const };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false as const, reason: "taken" as const };
    }
    throw error;
  }

  return { ok: true as const, email: request.newEmail };
}
