import { AccountType, ApprovalStatus } from "@/generated/prisma/client";
import { hashPassword } from "@/lib/auth/credentials";
import {
  notifyChildOfParentApproval,
  verifyParentApprovalToken,
} from "@/lib/auth/parent-invite";
import { getCountryLabel } from "@/lib/constants/locations";
import { getDefaultAdultDob } from "@/lib/form-validation";
import { simulateExtractedIdNumber } from "@/lib/guardian/constants";
import type { IdDocType, ProtectionTier } from "@/lib/guardian/constants";
import { deriveUserNameFromEmail } from "@/lib/auth/display-name";
import { ensureGuardianUserNames } from "@/lib/auth/guardian-user-names";
import { linkGuardianToChild } from "@/lib/guardian/guardian-child-link";
import { seedDefaultChatThreadsForUser } from "@/lib/feed/chat-service";
import { prisma } from "@/lib/prisma";
import { calculateAge } from "@/lib/utils/age";
import { formatLongDate } from "@/lib/utils/format-dates";
import { sendParentDeclinedChildEmail } from "@/lib/email/notifications";

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

export type AuthenticatedGuardianProfile = {
  name: string | null;
  email: string;
  country: string | null;
  region: string | null;
  statusLabel: string;
  emailVerified: boolean;
  ageVerified: boolean;
  dateOfBirthDisplay: string | null;
  accountTypeLabel: string;
};

export type GuardianContext = {
  requestId: string;
  status: ApprovalStatus;
  parentEmail: string;
  isReturningGuardian: boolean;
  /** Logged-in adult still needs the ID and selfie steps before this approval can finish. */
  requiresIdentityVerification: boolean;
  /** Logged-in account cannot approve because identity review was rejected. */
  identityRejected: boolean;
  authenticatedGuardian: boolean;
  authenticatedGuardianName: string | null;
  authenticatedGuardianEmail: string | null;
  authenticatedGuardianCountry: string | null;
  authenticatedGuardianRegion: string | null;
  authenticatedGuardianProfile: AuthenticatedGuardianProfile | null;
  child: GuardianChildContext;
  guardianCountry: string | null;
  guardianRegion: string | null;
  idDocType: IdDocType | null;
  protectionLevel: ProtectionTier | null;
  requiresActivationCode: boolean;
  simulatedParentName: string;
  simulatedParentDob: string;
  simulatedIdNumber: string;
};

export function buildAuthenticatedGuardianProfile(user: {
  email: string;
  firstName: string | null;
  lastName: string | null;
  country: string | null;
  region: string | null;
  emailVerified: Date | null;
  dateOfBirth: Date | null;
  accountType: AccountType;
  onboardingStep: string | null;
}): AuthenticatedGuardianProfile {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  const age = user.dateOfBirth
    ? calculateAge(
        user.dateOfBirth.getMonth() + 1,
        user.dateOfBirth.getDate(),
        user.dateOfBirth.getFullYear(),
      )
    : null;
  const ageVerified =
    user.onboardingStep === "complete" || (age != null && age >= 18);

  let statusLabel = "Active";
  if (user.onboardingStep === "guardian-setup") statusLabel = "Setup in progress";
  else if (user.onboardingStep && user.onboardingStep !== "complete") {
    statusLabel = "Onboarding incomplete";
  }

  const accountTypeLabel =
    user.accountType === AccountType.GUARDIAN
      ? "Guardian"
      : user.accountType === AccountType.MINOR
        ? "Minor"
        : "Adult";

  return {
    name: fullName || null,
    email: user.email,
    country: user.country,
    region: user.region,
    statusLabel,
    emailVerified: Boolean(user.emailVerified),
    ageVerified,
    dateOfBirthDisplay: user.dateOfBirth ? formatLongDate(user.dateOfBirth) : null,
    accountTypeLabel,
  };
}

/** Product ID capture is stored as "submitted". Admin review uses accepted | rejected. */
export const GUARDIAN_IDENTITY_SUBMITTED = "submitted";

type IdentityUser = {
  accountType: AccountType;
  onboardingStep: string | null;
  guardianIdentityStatus: string | null;
};

/**
 * Completed guardians, and anyone who already passed ID capture or admin review,
 * can approve another child without repeating ID and selfie.
 */
export function userCanSkipIdentityVerification(user: IdentityUser) {
  if (user.guardianIdentityStatus === "rejected") return false;
  if (
    user.guardianIdentityStatus === "accepted" ||
    user.guardianIdentityStatus === GUARDIAN_IDENTITY_SUBMITTED
  ) {
    return true;
  }
  return user.accountType === AccountType.GUARDIAN && user.onboardingStep === "complete";
}

export function userNeedsIdentityVerification(user: IdentityUser) {
  return !userCanSkipIdentityVerification(user);
}

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
  return deriveUserNameFromEmail(parentEmail).fullName;
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
  if (user.guardianIdentityStatus === "rejected") return null;
  return user;
}

export async function resolveGuardianToken(rawToken: string) {
  return verifyParentApprovalToken(rawToken);
}

export async function confirmMinorActivationCode(rawToken: string, code: string) {
  const verification = await verifyParentApprovalToken(rawToken);
  if (!verification.ok || verification.request.status !== ApprovalStatus.PENDING) {
    return { ok: false as const, error: "Invalid or expired approval link." };
  }

  const stored = verification.request.activationCode?.trim().toUpperCase() ?? "";
  if (!stored) {
    return { ok: false as const, error: "This request does not need an activation code." };
  }

  const entered = code.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(entered) || entered !== stored) {
    return {
      ok: false as const,
      error: "That code doesn't match. Check the code your child shared with you.",
    };
  }

  return { ok: true as const };
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
      requiresIdentityVerification: false,
      identityRejected: false,
      authenticatedGuardian: false,
      authenticatedGuardianName: null,
      authenticatedGuardianEmail: null,
      authenticatedGuardianCountry: null,
      authenticatedGuardianRegion: null,
      authenticatedGuardianProfile: null,
      child,
      guardianCountry: request.guardianCountry,
      guardianRegion: request.guardianRegion,
      idDocType: (request.idDocType as IdDocType | null) ?? null,
      protectionLevel: (request.protectionLevel as ProtectionTier | null) ?? null,
      requiresActivationCode: Boolean(request.activationCode),
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
  const derivedName = deriveUserNameFromEmail(request.parentEmail);

  const guardian = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: request.parentEmail,
        emailVerified: new Date(),
        accountType: AccountType.GUARDIAN,
        onboardingStep: "guardian-setup",
        passwordHash,
        firstName: derivedName.firstName,
        lastName: derivedName.lastName,
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

function approverAge(dateOfBirth: Date | null) {
  if (!dateOfBirth) return null;
  return calculateAge(
    dateOfBirth.getMonth() + 1,
    dateOfBirth.getDate(),
    dateOfBirth.getFullYear(),
  );
}

function existingAccountCanApprove(
  user: {
    id: string;
    email: string;
    accountType: AccountType;
    dateOfBirth: Date | null;
    suspendedAt: Date | null;
    guardianIdentityStatus: string | null;
  },
  parentEmail: string,
  childUserId: string,
) {
  if (user.suspendedAt) return false;
  if (user.id === childUserId) return false;
  if (user.accountType === AccountType.MINOR) return false;
  if (user.guardianIdentityStatus === "rejected") return false;
  if (user.email.trim().toLowerCase() !== parentEmail.trim().toLowerCase()) return false;
  const age = approverAge(user.dateOfBirth);
  if (age != null && age < 18) return false;
  return user.accountType === AccountType.ADULT || user.accountType === AccountType.GUARDIAN;
}

/**
 * Marks the approver as having finished in-product ID and selfie capture.
 * New guardians are already linked on the request. Existing adults are linked from the session.
 */
export async function recordGuardianIdentityCapture(
  requestId: string,
  input: { idDocType: IdDocType; sessionUserId: string | null },
) {
  const request = await prisma.parentApprovalRequest.findUnique({
    where: { id: requestId },
    include: { guardianUser: true },
  });

  if (!request || request.status !== ApprovalStatus.PENDING) {
    return { ok: false as const, error: "Invalid or expired approval link." };
  }

  let target = request.guardianUser;

  if (!target) {
    if (!input.sessionUserId) {
      return { ok: false as const, error: "Log in to verify your identity." };
    }
    const sessionUser = await prisma.user.findUnique({ where: { id: input.sessionUserId } });
    if (
      !sessionUser ||
      !existingAccountCanApprove(sessionUser, request.parentEmail, request.childUserId)
    ) {
      return {
        ok: false as const,
        error: "Log in with the invited email to verify your identity.",
      };
    }
    target = sessionUser;
  }

  if (target.accountType === AccountType.MINOR || target.id === request.childUserId) {
    return { ok: false as const, error: "A minor account cannot verify as a guardian." };
  }
  if (target.guardianIdentityStatus === "rejected") {
    return {
      ok: false as const,
      error: "Identity verification was rejected. You cannot approve a child until it is accepted.",
    };
  }

  const nextStatus =
    target.guardianIdentityStatus === "accepted"
      ? "accepted"
      : GUARDIAN_IDENTITY_SUBMITTED;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: target.id },
      data: { guardianIdentityStatus: nextStatus },
    });
    await tx.parentApprovalRequest.update({
      where: { id: requestId },
      data: {
        guardianUserId: target.id,
        idDocType: input.idDocType,
        guardianCountry: request.guardianCountry ?? target.country,
        guardianRegion: request.guardianRegion ?? target.region,
      },
    });
  });

  return { ok: true as const, guardianId: target.id };
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

  await sendParentDeclinedChildEmail(
    request.childUser.email,
    request.childUser.firstName ?? "there",
  );

  return request;
}

function buildGuardianApprovalSuccess(
  request: {
    childUser: {
      firstName: string | null;
      lastName: string | null;
      handle: string | null;
      dateOfBirth: Date | null;
    };
    parentEmail: string;
    resolvedAt: Date | null;
  },
  protectionLevel: ProtectionTier,
) {
  return {
    ok: true as const,
    childFirstName: request.childUser.firstName ?? "Your child",
    childFullName:
      [request.childUser.firstName, request.childUser.lastName].filter(Boolean).join(" ") ||
      request.childUser.firstName ||
      "Your child",
    childHandle: request.childUser.handle,
    childAge: request.childUser.dateOfBirth
      ? calculateAge(
          request.childUser.dateOfBirth.getMonth() + 1,
          request.childUser.dateOfBirth.getDate(),
          request.childUser.dateOfBirth.getFullYear(),
        )
      : null,
    parentEmail: request.parentEmail,
    protectionLevel,
    activatedAt: (request.resolvedAt ?? new Date()).toISOString(),
  };
}

async function runPostGuardianApprovalSideEffects(requestId: string, guardianUserId: string) {
  const guardian = await prisma.user.findUnique({
    where: { id: guardianUserId },
    select: { firstName: true },
  });

  try {
    await seedDefaultChatThreadsForUser(guardianUserId, { firstName: guardian?.firstName });
  } catch (error) {
    console.error("guardian approval: seed chat threads failed", error);
  }

  try {
    await notifyChildOfParentApproval(requestId);
  } catch (error) {
    console.error("guardian approval: notify child failed", error);
  }
}

export async function quickApproveReturningGuardian(requestId: string) {
  const request = await prisma.parentApprovalRequest.findUnique({
    where: { id: requestId },
    include: { childUser: true },
  });

  if (!request) {
    return { ok: false as const, error: "Invalid or expired approval link." };
  }

  if (request.status === ApprovalStatus.APPROVED) {
    if (!request.guardianUserId) {
      return { ok: false as const, error: "Guardian account not found." };
    }
    await linkGuardianToChild({
      guardianUserId: request.guardianUserId,
      childUserId: request.childUserId,
      parentApprovalRequestId: requestId,
      protectionLevel: request.protectionLevel,
      linkedAt: request.resolvedAt ?? undefined,
    });
    await runPostGuardianApprovalSideEffects(requestId, request.guardianUserId);
    const tier = (request.protectionLevel as ProtectionTier | null) ?? "standard";
    return {
      ok: true as const,
      childFirstName: request.childUser.firstName ?? "Your child",
      protectionLevel: tier,
    };
  }

  if (request.status !== ApprovalStatus.PENDING) {
    return { ok: false as const, error: "Invalid or expired approval link." };
  }

  const guardian = await findReturningGuardian(request.parentEmail);
  if (!guardian) {
    return { ok: false as const, error: "Guardian account not found." };
  }

  const protectionLevel: ProtectionTier = "standard";
  const resolvedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.parentApprovalRequest.update({
      where: { id: requestId },
      data: {
        status: ApprovalStatus.APPROVED,
        resolvedAt,
        guardianUserId: guardian.id,
        protectionLevel,
      },
    });
    await tx.user.update({
      where: { id: request.childUserId },
      data: { onboardingStep: "approved" },
    });
    await linkGuardianToChild(
      {
        guardianUserId: guardian.id,
        childUserId: request.childUserId,
        parentApprovalRequestId: requestId,
        protectionLevel,
        linkedAt: resolvedAt,
      },
      tx,
    );
  });

  await runPostGuardianApprovalSideEffects(requestId, guardian.id);

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
  options?: { sessionUserId?: string | null },
) {
  const request = await prisma.parentApprovalRequest.findUnique({
    where: { id: requestId },
    include: { childUser: true, guardianUser: true },
  });

  if (!request) {
    return { ok: false as const, error: "Invalid or expired approval link." };
  }

  if (request.status === ApprovalStatus.APPROVED) {
    if (!request.guardianUserId) {
      return { ok: false as const, error: "Guardian account not set up yet." };
    }
    const tier =
      (request.protectionLevel as ProtectionTier | null) ?? data.protectionLevel;
    await linkGuardianToChild({
      guardianUserId: request.guardianUserId,
      childUserId: request.childUserId,
      parentApprovalRequestId: requestId,
      protectionLevel: tier,
      linkedAt: request.resolvedAt ?? undefined,
    });
    await runPostGuardianApprovalSideEffects(requestId, request.guardianUserId);
    await ensureGuardianUserNames(request.guardianUserId, request.parentEmail);
    return buildGuardianApprovalSuccess(request, tier);
  }

  if (request.status !== ApprovalStatus.PENDING) {
    return { ok: false as const, error: "Invalid or expired approval link." };
  }

  let guardianUserId = request.guardianUserId;
  let guardianCountry = request.guardianCountry;
  let guardianRegion = request.guardianRegion;
  let approver = request.guardianUser;

  if (!guardianUserId) {
    const returningGuardian = await findReturningGuardian(request.parentEmail);
    if (returningGuardian) {
      guardianUserId = returningGuardian.id;
      guardianCountry = guardianCountry ?? returningGuardian.country;
      guardianRegion = guardianRegion ?? returningGuardian.region;
      approver = returningGuardian;
    } else if (options?.sessionUserId) {
      const sessionUser = await prisma.user.findUnique({ where: { id: options.sessionUserId } });
      if (
        !sessionUser ||
        !existingAccountCanApprove(sessionUser, request.parentEmail, request.childUserId)
      ) {
        return { ok: false as const, error: "Log in with the invited email to finish this approval." };
      }
      guardianUserId = sessionUser.id;
      guardianCountry = guardianCountry ?? sessionUser.country;
      guardianRegion = guardianRegion ?? sessionUser.region;
      approver = sessionUser;
    } else {
      return { ok: false as const, error: "Guardian account not set up yet." };
    }
  } else if (!approver) {
    approver = await prisma.user.findUnique({ where: { id: guardianUserId } });
  }

  if (!approver || !guardianUserId) {
    return { ok: false as const, error: "Guardian account not set up yet." };
  }

  if (approver.guardianIdentityStatus === "rejected") {
    return {
      ok: false as const,
      error: "Identity verification was rejected. You cannot approve a child until it is accepted.",
    };
  }

  if (!userCanSkipIdentityVerification(approver)) {
    return {
      ok: false as const,
      error: "Complete identity verification before approving this account.",
    };
  }

  const resolvedAt = new Date();
  const shouldFinishOnboarding =
    approver.onboardingStep !== "complete" && approver.accountType !== AccountType.ADULT;

  await prisma.$transaction(async (tx) => {
    await tx.parentApprovalRequest.update({
      where: { id: requestId },
      data: {
        status: ApprovalStatus.APPROVED,
        resolvedAt,
        guardianUserId,
        protectionLevel: data.protectionLevel,
        childLivesWithGuardian: data.childLivesWithGuardian,
        childLocationCountry: data.childLivesWithGuardian
          ? guardianCountry
          : data.childLocationCountry ?? null,
        childLocationRegion: data.childLivesWithGuardian
          ? guardianRegion
          : data.childLocationRegion ?? null,
      },
    });
    await tx.user.update({
      where: { id: guardianUserId },
      data: {
        accountType: AccountType.GUARDIAN,
        ...(shouldFinishOnboarding ? { onboardingStep: "complete" } : {}),
      },
    });
    await tx.user.update({
      where: { id: request.childUserId },
      data: { onboardingStep: "approved" },
    });
    await linkGuardianToChild(
      {
        guardianUserId,
        childUserId: request.childUserId,
        parentApprovalRequestId: requestId,
        protectionLevel: data.protectionLevel,
        linkedAt: resolvedAt,
      },
      tx,
    );
  });

  await runPostGuardianApprovalSideEffects(requestId, guardianUserId);

  await ensureGuardianUserNames(guardianUserId, request.parentEmail);

  return buildGuardianApprovalSuccess(
    { ...request, resolvedAt },
    data.protectionLevel,
  );
}
