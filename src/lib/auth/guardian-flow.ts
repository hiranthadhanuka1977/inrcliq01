import { AccountType, ApprovalStatus } from "@/generated/prisma/client";
import { hashPassword } from "@/lib/auth/credentials";
import { unlockChildAfterParentApproval, verifyParentApprovalToken } from "@/lib/auth/parent-invite";
import { getCountryLabel } from "@/lib/constants/locations";
import { getDefaultAdultDob } from "@/lib/form-validation";
import { simulateExtractedIdNumber } from "@/lib/guardian/constants";
import type { IdDocType, ProtectionTier } from "@/lib/guardian/constants";
import { prisma } from "@/lib/prisma";
import { calculateAge } from "@/lib/utils/age";
import { formatLongDate } from "@/lib/utils/format-dates";

export type GuardianChildContext = {
  firstName: string;
  fullName: string;
  email: string;
  handle: string | null;
  age: number | null;
  dateOfBirthDisplay: string | null;
  country: string | null;
  countryLabel: string | null;
  region: string | null;
  sentAt: string;
  sentAtDisplay: string;
};

export type GuardianContext = {
  requestId: string;
  status: ApprovalStatus;
  parentEmail: string;
  isReturningGuardian: boolean;
  child: GuardianChildContext;
  guardianCountry: string | null;
  guardianRegion: string | null;
  idDocType: IdDocType | null;
  protectionLevel: ProtectionTier | null;
  simulatedParentName: string;
  simulatedParentDob: string;
  simulatedIdNumber: string;
};

function buildChildContext(child: {
  firstName: string | null;
  lastName: string | null;
  email: string;
  handle: string | null;
  dateOfBirth: Date | null;
  country: string | null;
  region: string | null;
}, sentAt: Date): GuardianChildContext {
  const firstName = child.firstName ?? "Your child";
  const lastName = child.lastName ?? "";
  const fullName = [child.firstName, child.lastName].filter(Boolean).join(" ") || firstName;
  const age = child.dateOfBirth
    ? calculateAge(
        child.dateOfBirth.getMonth() + 1,
        child.dateOfBirth.getDate(),
        child.dateOfBirth.getFullYear(),
      )
    : null;

  return {
    firstName,
    fullName,
    email: child.email,
    handle: child.handle,
    age,
    dateOfBirthDisplay: child.dateOfBirth ? formatLongDate(child.dateOfBirth) : null,
    country: child.country,
    countryLabel: child.country ? getCountryLabel(child.country) : null,
    region: child.region,
    sentAt: sentAt.toISOString(),
    sentAtDisplay: formatLongDate(sentAt),
  };
}

function buildSimulatedParentName(parentEmail: string) {
  const local = parentEmail.split("@")[0] ?? "guardian";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) return "Guardian User";
  return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function buildSimulatedParentDob() {
  const { month, day, year } = getDefaultAdultDob();
  return formatLongDate(new Date(year, month - 1, day));
}

async function findReturningGuardian(parentEmail: string) {
  const user = await prisma.user.findUnique({ where: { email: parentEmail.toLowerCase() } });
  if (!user) return null;
  if (user.accountType !== AccountType.GUARDIAN) return null;
  if (user.onboardingStep !== "complete") return null;
  return user;
}

export async function resolveGuardianToken(rawToken: string) {
  return verifyParentApprovalToken(rawToken);
}

export async function buildGuardianContext(rawToken: string): Promise<
  | { ok: true; context: GuardianContext }
  | { ok: false; reason: "invalid" | "expired" | "resolved"; status?: ApprovalStatus }
> {
  const verification = await verifyParentApprovalToken(rawToken);
  if (!verification.ok) {
    return { ok: false, reason: "invalid" };
  }

  const { request } = verification;
  if (request.status !== ApprovalStatus.PENDING) {
    return { ok: false, reason: "resolved", status: request.status };
  }

  const returningGuardian = await findReturningGuardian(request.parentEmail);
  const child = buildChildContext(request.childUser, request.sentAt);
  const simulatedParentName = buildSimulatedParentName(request.parentEmail);

  return {
    ok: true,
    context: {
      requestId: request.id,
      status: request.status,
      parentEmail: request.parentEmail,
      isReturningGuardian: Boolean(returningGuardian),
      child,
      guardianCountry: request.guardianCountry,
      guardianRegion: request.guardianRegion,
      idDocType: (request.idDocType as IdDocType | null) ?? null,
      protectionLevel: (request.protectionLevel as ProtectionTier | null) ?? null,
      simulatedParentName,
      simulatedParentDob: buildSimulatedParentDob(),
      simulatedIdNumber: simulateExtractedIdNumber(request.parentEmail),
    },
  };
}

export async function createGuardianAccount(
  requestId: string,
  data: {
    password: string;
    country: string;
    region: string | null;
    idDocType?: IdDocType;
  },
) {
  const request = await prisma.parentApprovalRequest.findUnique({
    where: { id: requestId },
    include: { childUser: true },
  });

  if (!request || request.status !== ApprovalStatus.PENDING) {
    return { ok: false as const, error: "Invalid or expired approval link." };
  }

  const existing = await prisma.user.findUnique({ where: { email: request.parentEmail } });
  if (existing) {
    if (
      existing.accountType === AccountType.GUARDIAN &&
      existing.onboardingStep === "guardian-setup" &&
      request.guardianUserId === existing.id
    ) {
      return { ok: true as const, guardianId: existing.id };
    }

    if (existing.accountType === AccountType.GUARDIAN && existing.onboardingStep === "guardian-setup") {
      await prisma.parentApprovalRequest.update({
        where: { id: requestId },
        data: {
          guardianUserId: existing.id,
          guardianCountry: data.country,
          guardianRegion: data.region,
          idDocType: data.idDocType ?? "passport",
        },
      });
      return { ok: true as const, guardianId: existing.id };
    }

    return { ok: false as const, error: "An account already exists for this email. Please log in instead." };
  }

  const passwordHash = await hashPassword(data.password);

  const guardian = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: request.parentEmail,
        emailVerified: new Date(),
        accountType: AccountType.GUARDIAN,
        onboardingStep: "guardian-setup",
        passwordHash,
        country: data.country,
        region: data.region,
      },
    });

    await tx.parentApprovalRequest.update({
      where: { id: requestId },
      data: {
        guardianUserId: created.id,
        guardianCountry: data.country,
        guardianRegion: data.region,
        idDocType: data.idDocType ?? "passport",
      },
    });

    return created;
  });

  return { ok: true as const, guardianId: guardian.id };
}

export async function declineParentRequestById(requestId: string) {
  const request = await prisma.parentApprovalRequest.update({
    where: { id: requestId },
    data: {
      status: ApprovalStatus.DECLINED,
      resolvedAt: new Date(),
    },
    include: { childUser: true },
  });

  return request;
}

export async function quickApproveReturningGuardian(requestId: string) {
  const request = await prisma.parentApprovalRequest.findUnique({
    where: { id: requestId },
    include: { childUser: true },
  });

  if (!request || request.status !== ApprovalStatus.PENDING) {
    return { ok: false as const, error: "Invalid or expired approval link." };
  }

  const guardian = await findReturningGuardian(request.parentEmail);
  if (!guardian) {
    return { ok: false as const, error: "Guardian account not found." };
  }

  const protectionLevel: ProtectionTier = "standard";

  await prisma.parentApprovalRequest.update({
    where: { id: requestId },
    data: {
      status: ApprovalStatus.APPROVED,
      resolvedAt: new Date(),
      guardianUserId: guardian.id,
      protectionLevel,
    },
  });

  await unlockChildAfterParentApproval(request.childUserId);

  return {
    ok: true as const,
    childFirstName: request.childUser.firstName ?? "Your child",
    protectionLevel,
  };
}

export async function completeGuardianApproval(
  requestId: string,
  data: {
    protectionLevel: ProtectionTier;
    childLivesWithGuardian: boolean;
    childLocationCountry?: string | null;
    childLocationRegion?: string | null;
  },
) {
  const request = await prisma.parentApprovalRequest.findUnique({
    where: { id: requestId },
    include: { childUser: true, guardianUser: true },
  });

  if (!request || request.status !== ApprovalStatus.PENDING) {
    return { ok: false as const, error: "Invalid or expired approval link." };
  }

  if (!request.guardianUserId) {
    return { ok: false as const, error: "Guardian account not set up yet." };
  }

  await prisma.$transaction([
    prisma.parentApprovalRequest.update({
      where: { id: requestId },
      data: {
        status: ApprovalStatus.APPROVED,
        resolvedAt: new Date(),
        protectionLevel: data.protectionLevel,
        childLivesWithGuardian: data.childLivesWithGuardian,
        childLocationCountry: data.childLivesWithGuardian
          ? request.guardianCountry
          : data.childLocationCountry ?? null,
        childLocationRegion: data.childLivesWithGuardian
          ? request.guardianRegion
          : data.childLocationRegion ?? null,
      },
    }),
    prisma.user.update({
      where: { id: request.guardianUserId },
      data: { onboardingStep: "complete" },
    }),
    prisma.user.update({
      where: { id: request.childUserId },
      data: { onboardingStep: "approved" },
    }),
  ]);

  return {
    ok: true as const,
    childFirstName: request.childUser.firstName ?? "Your child",
    childFullName: [request.childUser.firstName, request.childUser.lastName].filter(Boolean).join(" ")
      || request.childUser.firstName
      || "Your child",
    childHandle: request.childUser.handle,
    childAge: request.childUser.dateOfBirth
      ? calculateAge(
          request.childUser.dateOfBirth.getMonth() + 1,
          request.childUser.dateOfBirth.getDate(),
          request.childUser.dateOfBirth.getFullYear(),
        )
      : null,
    parentEmail: request.parentEmail,
    protectionLevel: data.protectionLevel,
    activatedAt: new Date().toISOString(),
  };
}
