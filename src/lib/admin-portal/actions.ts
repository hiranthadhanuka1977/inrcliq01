import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { AccountType, ApprovalStatus } from "@/generated/prisma/client";
import { writeAdminAudit } from "@/lib/admin-portal/audit";
import { createEmailVerificationToken, sendVerificationEmail } from "@/lib/auth/email-verification";
import { getPostVerifyOnboardingStep } from "@/lib/auth/onboarding";
import {
  createParentApprovalRequest,
  issueChildContinueUrl,
  notifyChildOfParentApproval,
  sendParentInviteEmail,
} from "@/lib/auth/parent-invite";
import { declineParentRequestById } from "@/lib/auth/guardian-flow";
import { isValidEmailFormat } from "@/lib/form-validation";
import { linkGuardianToChild } from "@/lib/guardian/guardian-child-link";
import { PROTECTION_TIER_LABELS, type ProtectionTier } from "@/lib/guardian/constants";
import { sendParentApprovedChildEmail } from "@/lib/email/notifications";
import { ageZoneWriteData } from "@/lib/guardian/user-age-zone";
import { prisma } from "@/lib/prisma";
import { COUNTRIES } from "@/lib/constants/locations";
import { deleteSettingsUser } from "@/lib/settings/users";
import { ageInYears } from "@/lib/utils/age-zone";

type Result = { ok: true; message: string } | { ok: false; error: string };

const MINOR_STEPS = ["parent", "waiting", "approved", "password", "handle", "interests", "complete"] as const;
const ADULT_STEPS = ["password", "handle", "interests", "complete"] as const;
const AFTER_APPROVAL = new Set(["password", "handle", "interests", "complete"]);

export async function runAdminAction(body: unknown): Promise<Result> {
  if (!body || typeof body !== "object") return { ok: false, error: "Missing action." };
  const input = body as Record<string, unknown>;
  const action = typeof input.action === "string" ? input.action : "";
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (reason.length < 3) return { ok: false, error: "Enter a reason of at least 3 characters." };

  const userId = typeof input.userId === "string" ? input.userId : "";
  if (!userId) return { ok: false, error: "Missing user." };

  switch (action) {
    case "resend-verification":
      return resendVerification(userId, reason);
    case "resend-invite":
      return resendInvite(userId, reason);
    case "resend-continue":
      return resendContinue(userId, reason);
    case "expire-invite":
      return expireInvite(userId, reason);
    case "correct-email":
      return correctEmail(userId, reason, input.email);
    case "change-guardian-email":
      return changeGuardianEmail(userId, reason, input.email);
    case "mark-verified":
      return markVerified(userId, reason);
    case "force-approve":
      return forceApprove(userId, reason, input, "force-approve");
    case "force-decline":
      return forceDecline(userId, reason);
    case "apply-age-gate":
      return applyAgeGate(userId, reason);
    case "repair-step":
      return repairStep(userId, reason, input.step);
    case "review-identity":
      return reviewIdentity(userId, reason, input.decision);
    case "link-guardian":
      return linkGuardian(userId, reason, input);
    case "unlink-guardian":
      return unlinkGuardian(userId, reason, input.guardianUserId);
    case "change-protection":
      return changeProtection(userId, reason, input.protectionLevel);
    case "update-identity":
      return updateIdentity(userId, reason, input);
    case "suspend":
      return suspendUser(userId, reason);
    case "restore":
      return restoreUser(userId, reason);
    case "clear-password":
      return clearPassword(userId, reason);
    case "delete-user":
      return deleteUser(userId, reason);
    default:
      return { ok: false, error: "Unknown action." };
  }
}

async function loadUser(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}

async function latestRequest(childUserId: string) {
  return prisma.parentApprovalRequest.findFirst({
    where: { childUserId },
    orderBy: { createdAt: "desc" },
  });
}

async function resendVerification(userId: string, reason: string): Promise<Result> {
  const user = await loadUser(userId);
  if (!user) return { ok: false, error: "User not found." };
  if (user.emailVerified) return { ok: false, error: "This email is already verified." };

  const created = await createEmailVerificationToken(user.email, { bypassCooldown: true });
  if (!created.ok) return { ok: false, error: "Unable to create a verification email." };
  await sendVerificationEmail(user.email, created.verifyUrl);
  await writeAdminAudit({
    action: "resend-verification",
    targetUserId: user.id,
    reason,
    after: { email: user.email },
  });
  return { ok: true, message: `Verification email sent to ${user.email}.` };
}

async function resendInvite(userId: string, reason: string): Promise<Result> {
  const user = await loadUser(userId);
  if (!user) return { ok: false, error: "User not found." };
  if (user.accountType !== AccountType.MINOR) return { ok: false, error: "Only a minor has a guardian invite." };

  const current = await latestRequest(user.id);
  if (!current?.parentEmail) return { ok: false, error: "Set a guardian email before resending." };

  const created = await createParentApprovalRequest(user.id, current.parentEmail, { bypassCooldown: true });
  if (!created.ok) return { ok: false, error: "Unable to create a new invite." };
  await sendParentInviteEmail(current.parentEmail, created.approveUrl, user.firstName ?? "there");
  await prisma.user.update({ where: { id: user.id }, data: { onboardingStep: "waiting" } });
  await writeAdminAudit({
    action: "resend-invite",
    targetUserId: user.id,
    reason,
    after: { parentEmail: current.parentEmail, requestId: created.request.id },
  });
  return { ok: true, message: `Guardian invite sent to ${current.parentEmail}.` };
}

async function resendContinue(userId: string, reason: string): Promise<Result> {
  const user = await loadUser(userId);
  if (!user) return { ok: false, error: "User not found." };
  const request = await latestRequest(user.id);
  if (!request || request.status !== ApprovalStatus.APPROVED || request.revokedAt) {
    return { ok: false, error: "Continue links are sent after an active approval." };
  }
  if (user.onboardingStep === "complete") {
    return { ok: false, error: "This child has already finished onboarding." };
  }

  const continueUrl = await issueChildContinueUrl(request.id);
  await sendParentApprovedChildEmail(user.email, user.firstName ?? "there", continueUrl);
  await writeAdminAudit({
    action: "resend-continue",
    targetUserId: user.id,
    reason,
    after: { requestId: request.id },
  });
  return { ok: true, message: `Continue link sent to ${user.email}.` };
}

async function expireInvite(userId: string, reason: string): Promise<Result> {
  const request = await latestRequest(userId);
  if (!request || request.status !== ApprovalStatus.PENDING) {
    return { ok: false, error: "There is no open invite to expire." };
  }
  await prisma.parentApprovalRequest.update({
    where: { id: request.id },
    data: { status: ApprovalStatus.EXPIRED, resolvedAt: new Date() },
  });
  await writeAdminAudit({
    action: "expire-invite",
    targetUserId: userId,
    reason,
    before: { requestId: request.id, status: request.status },
    after: { status: "EXPIRED" },
  });
  return { ok: true, message: "The open guardian invite is now expired." };
}

async function correctEmail(userId: string, reason: string, emailValue: unknown): Promise<Result> {
  const user = await loadUser(userId);
  if (!user) return { ok: false, error: "User not found." };
  const email = typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";
  if (!isValidEmailFormat(email)) return { ok: false, error: "Enter a valid email address." };
  if (email === user.email) return { ok: false, error: "That is already the account email." };

  const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (taken) return { ok: false, error: "Another account already uses that email." };

  const request = await latestRequest(user.id);
  if (request && request.parentEmail === email && request.status === ApprovalStatus.PENDING) {
    return { ok: false, error: "The child email and guardian email must be different." };
  }

  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({ where: { email: user.email } }),
    prisma.user.update({
      where: { id: user.id },
      data: { email, emailVerified: null, onboardingStep: null },
    }),
  ]);
  await writeAdminAudit({
    action: "correct-email",
    targetUserId: user.id,
    reason,
    before: { email: user.email },
    after: { email },
  });
  return { ok: true, message: `Email changed to ${email}. They need to verify it again.` };
}

async function changeGuardianEmail(userId: string, reason: string, emailValue: unknown): Promise<Result> {
  const user = await loadUser(userId);
  if (!user) return { ok: false, error: "User not found." };
  if (user.accountType !== AccountType.MINOR) return { ok: false, error: "Only a minor has a guardian email." };
  const email = typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";
  if (!isValidEmailFormat(email)) return { ok: false, error: "Enter a valid guardian email." };
  if (email === user.email) return { ok: false, error: "The guardian email must be different from the child's email." };

  const created = await createParentApprovalRequest(user.id, email, { bypassCooldown: true });
  if (!created.ok) return { ok: false, error: "Unable to send the invite." };
  await sendParentInviteEmail(email, created.approveUrl, user.firstName ?? "there");
  await prisma.user.update({ where: { id: user.id }, data: { onboardingStep: "waiting" } });
  await writeAdminAudit({
    action: "change-guardian-email",
    targetUserId: user.id,
    reason,
    after: { parentEmail: email, requestId: created.request.id },
  });
  return { ok: true, message: `Invite sent to ${email}. The previous open invite was expired.` };
}

async function markVerified(userId: string, reason: string): Promise<Result> {
  const user = await loadUser(userId);
  if (!user) return { ok: false, error: "User not found." };
  if (user.emailVerified) return { ok: false, error: "This email is already verified." };

  const onboardingStep = getPostVerifyOnboardingStep(user);
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date(), onboardingStep },
  });
  await writeAdminAudit({
    action: "mark-verified",
    targetUserId: user.id,
    reason,
    after: { onboardingStep },
  });
  return { ok: true, message: "Email marked verified." };
}

async function forceApprove(
  userId: string,
  reason: string,
  input: Record<string, unknown>,
  actionName: string,
): Promise<Result> {
  const child = await loadUser(userId);
  if (!child) return { ok: false, error: "User not found." };
  if (child.accountType !== AccountType.MINOR) return { ok: false, error: "Only a minor can be approved." };

  const protectionLevel = protectionOf(input.protectionLevel);
  if (!protectionLevel) return { ok: false, error: "Choose a protection level." };
  const guardianUserId = typeof input.guardianUserId === "string" ? input.guardianUserId : "";
  const waiver = input.identityWaiver === true;
  const guardian = await loadGuardianForLink(guardianUserId, waiver);
  if (!guardian.ok) return guardian;
  if (guardian.user.email === child.email) {
    return { ok: false, error: "The guardian email must be different from the child's email." };
  }

  const current = await latestRequest(child.id);
  const resolvedAt = new Date();
  const requestId = await prisma.$transaction(async (tx) => {
    const canUpdate =
      current &&
      !current.revokedAt &&
      (current.status === ApprovalStatus.PENDING || current.status === ApprovalStatus.EXPIRED);
    const request = canUpdate
      ? await tx.parentApprovalRequest.update({
          where: { id: current.id },
          data: {
            status: ApprovalStatus.APPROVED,
            resolvedAt,
            guardianUserId: guardian.user.id,
            parentEmail: guardian.user.email,
            protectionLevel,
            revokedAt: null,
          },
        })
      : await tx.parentApprovalRequest.create({
          data: {
            childUserId: child.id,
            parentEmail: guardian.user.email,
            guardianUserId: guardian.user.id,
            status: ApprovalStatus.APPROVED,
            tokenHash: await bcrypt.hash(randomBytes(32).toString("hex"), 10),
            expiresAt: resolvedAt,
            resolvedAt,
            protectionLevel,
          },
        });

    await tx.user.update({ where: { id: child.id }, data: { onboardingStep: "approved" } });
    await linkGuardianToChild(
      {
        guardianUserId: guardian.user.id,
        childUserId: child.id,
        parentApprovalRequestId: request.id,
        protectionLevel,
        linkedAt: resolvedAt,
      },
      tx,
    );
    return request.id;
  });

  await notifyChildOfParentApproval(requestId);
  await writeAdminAudit({
    action: actionName,
    targetUserId: child.id,
    reason,
    after: {
      requestId,
      guardianUserId: guardian.user.id,
      protectionLevel,
      identityWaiver: waiver,
    },
  });
  return { ok: true, message: `Approved and linked to ${guardian.user.email}. The child has been emailed.` };
}

async function forceDecline(userId: string, reason: string): Promise<Result> {
  const request = await latestRequest(userId);
  if (!request || (request.status !== ApprovalStatus.PENDING && request.status !== ApprovalStatus.EXPIRED)) {
    return { ok: false, error: "There is no open or expired invite to decline." };
  }
  await declineParentRequestById(request.id);
  await writeAdminAudit({
    action: "force-decline",
    targetUserId: userId,
    reason,
    after: { requestId: request.id, parentEmail: request.parentEmail },
  });
  return { ok: true, message: `Declined the invite to ${request.parentEmail} and emailed the child.` };
}

async function applyAgeGate(userId: string, reason: string): Promise<Result> {
  const user = await loadUser(userId);
  if (!user) return { ok: false, error: "User not found." };
  if (!user.dateOfBirth) return { ok: false, error: "Record a date of birth first." };
  if (user.accountType === AccountType.GUARDIAN) {
    return { ok: false, error: "Guardian accounts are not moved through the age gate." };
  }

  const age = ageInYears(user.dateOfBirth);
  if (user.accountType === AccountType.MINOR && age >= 18) {
    await prisma.$transaction(async (tx) => {
      await tx.parentApprovalRequest.updateMany({
        where: { childUserId: user.id, status: ApprovalStatus.PENDING },
        data: { status: ApprovalStatus.EXPIRED, resolvedAt: new Date() },
      });
      const nextStep =
        user.onboardingStep === "complete" ||
        user.onboardingStep === "handle" ||
        user.onboardingStep === "interests" ||
        user.onboardingStep === "password"
          ? user.onboardingStep
          : user.emailVerified
            ? "password"
            : null;
      await tx.user.update({
        where: { id: user.id },
        data: { accountType: AccountType.ADULT, onboardingStep: nextStep, ...ageZoneWriteData(user.dateOfBirth) },
      });
    });
    await writeAdminAudit({
      action: "apply-age-gate",
      targetUserId: user.id,
      reason,
      before: { accountType: user.accountType },
      after: { accountType: "ADULT" },
    });
    return { ok: true, message: "Account converted to adult. Open guardian invites were expired." };
  }

  if (user.accountType === AccountType.ADULT && age < 18) {
    await prisma.$transaction(async (tx) => {
      const links = await tx.guardianChildLink.findMany({ where: { childUserId: user.id } });
      const requestIds = links.map((link) => link.parentApprovalRequestId).filter((id): id is string => Boolean(id));
      if (requestIds.length) {
        await tx.parentApprovalRequest.updateMany({
          where: { id: { in: requestIds } },
          data: { revokedAt: new Date() },
        });
      }
      await tx.guardianChildLink.deleteMany({ where: { childUserId: user.id } });
      await tx.parentApprovalRequest.updateMany({
        where: { childUserId: user.id, status: ApprovalStatus.PENDING },
        data: { status: ApprovalStatus.EXPIRED, resolvedAt: new Date() },
      });
      await tx.user.update({
        where: { id: user.id },
        data: {
          accountType: AccountType.MINOR,
          onboardingStep: user.emailVerified ? "parent" : null,
          ...ageZoneWriteData(user.dateOfBirth),
        },
      });
    });
    await writeAdminAudit({
      action: "apply-age-gate",
      targetUserId: user.id,
      reason,
      before: { accountType: user.accountType },
      after: { accountType: "MINOR", onboardingStep: "parent" },
    });
    return { ok: true, message: "Account converted to minor and returned to the guardian-email step." };
  }

  return { ok: false, error: "The date of birth already matches this account type." };
}

async function repairStep(userId: string, reason: string, stepValue: unknown): Promise<Result> {
  const user = await loadUser(userId);
  if (!user) return { ok: false, error: "User not found." };
  const step = typeof stepValue === "string" ? stepValue : "";
  const allowed: readonly string[] =
    user.accountType === AccountType.MINOR ? MINOR_STEPS : user.accountType === AccountType.ADULT ? ADULT_STEPS : [];
  if (!allowed.includes(step)) {
    return { ok: false, error: "That step is not available for this account type." };
  }
  if (!user.emailVerified && step !== "parent") {
    return { ok: false, error: "Verify the email before moving this account forward." };
  }

  if (user.accountType === AccountType.MINOR && (step === "approved" || AFTER_APPROVAL.has(step))) {
    const link = await prisma.guardianChildLink.findFirst({ where: { childUserId: user.id } });
    const request = await latestRequest(user.id);
    const approved = request?.status === ApprovalStatus.APPROVED && !request.revokedAt;
    if (!link || !approved) {
      return { ok: false, error: "A minor needs an active guardian approval before this step." };
    }
  }
  if (user.accountType === AccountType.MINOR && step === "waiting") {
    const request = await latestRequest(user.id);
    if (!request || request.status !== ApprovalStatus.PENDING) {
      return { ok: false, error: "Send a guardian invite before moving to waiting." };
    }
  }

  await prisma.user.update({ where: { id: user.id }, data: { onboardingStep: step } });
  await writeAdminAudit({
    action: "repair-step",
    targetUserId: user.id,
    reason,
    before: { onboardingStep: user.onboardingStep },
    after: { onboardingStep: step },
  });
  return { ok: true, message: `Onboarding step set to ${step}.` };
}

async function reviewIdentity(userId: string, reason: string, decisionValue: unknown): Promise<Result> {
  const user = await loadUser(userId);
  if (!user) return { ok: false, error: "User not found." };
  if (user.accountType !== AccountType.GUARDIAN) return { ok: false, error: "Identity review is for guardian accounts." };
  const decision = decisionValue === "accepted" || decisionValue === "rejected" ? decisionValue : null;
  if (!decision) return { ok: false, error: "Choose accept or reject." };

  await prisma.user.update({
    where: { id: user.id },
    data: { guardianIdentityStatus: decision },
  });
  await writeAdminAudit({
    action: "review-identity",
    targetUserId: user.id,
    reason,
    before: { guardianIdentityStatus: user.guardianIdentityStatus },
    after: { guardianIdentityStatus: decision },
  });
  return {
    ok: true,
    message:
      decision === "accepted"
        ? "Guardian identity marked accepted. ID and selfie capture in the product is still simulated."
        : "Guardian identity rejected. They cannot approve another child until this is accepted.",
  };
}

async function linkGuardian(userId: string, reason: string, input: Record<string, unknown>): Promise<Result> {
  return forceApprove(userId, reason, { ...input, identityWaiver: false }, "link-guardian");
}

async function unlinkGuardian(userId: string, reason: string, guardianValue: unknown): Promise<Result> {
  const child = await loadUser(userId);
  if (!child) return { ok: false, error: "User not found." };
  const guardianUserId = typeof guardianValue === "string" ? guardianValue : "";
  const links = await prisma.guardianChildLink.findMany({
    where: { childUserId: child.id, ...(guardianUserId ? { guardianUserId } : {}) },
  });
  if (!links.length) return { ok: false, error: "This child has no guardian link to remove." };

  await prisma.$transaction(async (tx) => {
    const requestIds = links.map((link) => link.parentApprovalRequestId).filter((id): id is string => Boolean(id));
    if (requestIds.length) {
      await tx.parentApprovalRequest.updateMany({
        where: { id: { in: requestIds } },
        data: { revokedAt: new Date() },
      });
    }
    await tx.guardianChildLink.deleteMany({ where: { id: { in: links.map((link) => link.id) } } });
    const remaining = await tx.guardianChildLink.count({ where: { childUserId: child.id } });
    if (remaining === 0) {
      await tx.user.update({ where: { id: child.id }, data: { onboardingStep: "parent" } });
    }
  });

  await writeAdminAudit({
    action: "unlink-guardian",
    targetUserId: child.id,
    reason,
    after: { removedLinks: links.length },
  });
  return { ok: true, message: "Guardian link removed. The child is back on the guardian-email step if no other guardian remains." };
}

async function changeProtection(userId: string, reason: string, levelValue: unknown): Promise<Result> {
  const protectionLevel = protectionOf(levelValue);
  if (!protectionLevel) return { ok: false, error: "Choose a protection level." };
  const links = await prisma.guardianChildLink.findMany({ where: { childUserId: userId } });
  if (!links.length) return { ok: false, error: "Link a guardian before setting a protection level." };

  await prisma.$transaction([
    prisma.guardianChildLink.updateMany({ where: { childUserId: userId }, data: { protectionLevel } }),
    prisma.parentApprovalRequest.updateMany({
      where: { id: { in: links.map((link) => link.parentApprovalRequestId).filter((id): id is string => Boolean(id)) } },
      data: { protectionLevel },
    }),
  ]);
  await writeAdminAudit({
    action: "change-protection",
    targetUserId: userId,
    reason,
    after: { protectionLevel },
  });
  return { ok: true, message: `Protection level set to ${PROTECTION_TIER_LABELS[protectionLevel]}.` };
}

async function updateIdentity(userId: string, reason: string, input: Record<string, unknown>): Promise<Result> {
  const user = await loadUser(userId);
  if (!user) return { ok: false, error: "User not found." };
  const firstName = cleanName(input.firstName);
  const lastName = cleanName(input.lastName);
  if (firstName == null || lastName == null) return { ok: false, error: "Names must be 80 characters or fewer." };

  const country = typeof input.country === "string" ? input.country.trim() : "";
  if (country && !COUNTRIES.some((item) => item.code === country)) {
    return { ok: false, error: "Choose a known country." };
  }
  const region = typeof input.region === "string" ? input.region.trim().slice(0, 80) : "";
  const dateOfBirth = parseDob(input.dateOfBirth);
  if (dateOfBirth === "invalid") return { ok: false, error: "Enter a real date of birth that is not in the future." };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: firstName || null,
      lastName: lastName || null,
      country: country || null,
      region: region || null,
      dateOfBirth,
      ...ageZoneWriteData(dateOfBirth),
    },
  });
  await writeAdminAudit({
    action: "update-identity",
    targetUserId: user.id,
    reason,
    before: {
      firstName: user.firstName,
      lastName: user.lastName,
      country: user.country,
      region: user.region,
      dateOfBirth: user.dateOfBirth?.toISOString().slice(0, 10) ?? null,
    },
    after: { firstName, lastName, country, region, dateOfBirth: dateOfBirth?.toISOString().slice(0, 10) ?? null },
  });
  return { ok: true, message: "Identity details saved. Account type was left unchanged." };
}

async function suspendUser(userId: string, reason: string): Promise<Result> {
  const user = await loadUser(userId);
  if (!user) return { ok: false, error: "User not found." };
  if (user.suspendedAt) return { ok: false, error: "This account is already suspended." };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { suspendedAt: new Date(), suspendReason: reason },
    }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);
  await writeAdminAudit({
    action: "suspend",
    targetUserId: user.id,
    reason,
    after: { suspended: true },
  });
  return { ok: true, message: "Account suspended. Existing sessions were ended." };
}

async function restoreUser(userId: string, reason: string): Promise<Result> {
  const user = await loadUser(userId);
  if (!user) return { ok: false, error: "User not found." };
  if (!user.suspendedAt) return { ok: false, error: "This account is not suspended." };

  await prisma.user.update({
    where: { id: user.id },
    data: { suspendedAt: null, suspendReason: null },
  });
  await writeAdminAudit({
    action: "restore",
    targetUserId: user.id,
    reason,
    after: { suspended: false },
  });
  return { ok: true, message: "Sign-in restored. Guardian approval is still required if onboarding is unfinished." };
}

async function clearPassword(userId: string, reason: string): Promise<Result> {
  const user = await loadUser(userId);
  if (!user) return { ok: false, error: "User not found." };
  if (!user.passwordHash) return { ok: false, error: "This account already signs in with an email code." };
  if (user.accountType === AccountType.MINOR && user.onboardingStep !== "complete" && user.onboardingStep !== "handle" && user.onboardingStep !== "interests") {
    return { ok: false, error: "Clear a password only after the minor has set one." };
  }

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: null } });
  await writeAdminAudit({ action: "clear-password", targetUserId: user.id, reason, after: { password: "cleared" } });
  return { ok: true, message: "Password cleared. The next sign-in uses an email code." };
}

async function deleteUser(userId: string, reason: string): Promise<Result> {
  const user = await loadUser(userId);
  if (!user) return { ok: false, error: "User not found." };
  const [children, guardians, posts] = await Promise.all([
    prisma.guardianChildLink.count({ where: { guardianUserId: user.id } }),
    prisma.guardianChildLink.count({ where: { childUserId: user.id } }),
    prisma.feedPost.count({ where: { userId: user.id } }),
  ]);
  const deleted = await deleteSettingsUser(user.id);
  if (!deleted.ok) return deleted;
  await writeAdminAudit({
    action: "delete-user",
    targetUserId: null,
    reason,
    before: { id: user.id, email: user.email, accountType: user.accountType, children, guardians },
    after: { deleted: true, feedPostsRemaining: posts },
  });
  return {
    ok: true,
    message: `Deleted ${user.email}. ${posts === 1 ? "1 feed post remains" : `${posts} feed posts remain`} in the feed.`,
  };
}

async function loadGuardianForLink(
  guardianUserId: string,
  waiver: boolean,
): Promise<{ ok: true; user: { id: string; email: string } } | { ok: false; error: string }> {
  if (!guardianUserId) return { ok: false, error: "Choose a guardian account." };
  const guardian = await prisma.user.findUnique({ where: { id: guardianUserId } });
  if (!guardian || guardian.accountType !== AccountType.GUARDIAN) {
    return { ok: false, error: "Choose a guardian account." };
  }
  if (guardian.guardianIdentityStatus === "rejected") {
    return { ok: false, error: "Accept this guardian's identity before linking a child." };
  }
  if (guardian.onboardingStep !== "complete" && !waiver) {
    return { ok: false, error: "This guardian has not finished setup. Record an identity waiver to approve anyway." };
  }
  return { ok: true, user: guardian };
}

function protectionOf(value: unknown): ProtectionTier | null {
  if (value === "strict" || value === "standard" || value === "relaxed") return value;
  return null;
}

function cleanName(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (trimmed.length > 80) return null;
  return trimmed;
}

function parseDob(value: unknown): Date | null | "invalid" {
  if (typeof value !== "string" || !value.trim()) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "invalid";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return "invalid";
  }
  if (date.getTime() > Date.now()) return "invalid";
  if (ageInYears(date) > 120) return "invalid";
  return date;
}

export type AdminActionClient = {
  action: string;
  userId: string;
  reason: string;
  email?: string;
  step?: string;
  guardianUserId?: string;
  protectionLevel?: string;
  identityWaiver?: boolean;
  decision?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  country?: string;
  region?: string;
};
