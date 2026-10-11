import { prisma } from "@/lib/prisma";
import { ageGateSuggestion, formatStamp, stepLabel, tokenHealth, type RequestSnapshot } from "@/lib/admin-portal/stuck";
import { getCountryLabel } from "@/lib/constants/locations";
import { AGE_ZONE_LABELS, type AgeZoneCode } from "@/lib/utils/age-zone";

function personName(firstName: string | null, lastName: string | null, email: string) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || email;
}

export async function getAdminUserRecord(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      parentApprovalRequests: { orderBy: { createdAt: "desc" } },
      guardianApprovalRequests: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { childUser: { select: { id: true, email: true, firstName: true, lastName: true } } },
      },
      childGuardians: {
        include: {
          guardianUser: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      },
      guardianChildren: {
        include: {
          childUser: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      },
      sessions: { where: { expires: { gt: new Date() } }, select: { id: true } },
    },
  });

  if (!user) return null;

  const latestVerification = await prisma.emailVerificationToken.findFirst({
    where: { email: user.email },
    orderBy: { createdAt: "desc" },
    select: { usedAt: true, expiresAt: true },
  });

  const postCount = await prisma.feedPost.count({ where: { userId: user.id } });
  const latest = user.parentApprovalRequests[0] ?? null;
  const requestSnapshot: RequestSnapshot | null = latest
    ? {
        status: latest.status,
        parentEmail: latest.parentEmail,
        expiresAt: latest.expiresAt,
        sentAt: latest.sentAt,
        resolvedAt: latest.resolvedAt,
        revokedAt: latest.revokedAt,
        protectionLevel: latest.protectionLevel,
        continueTokenExpiresAt: latest.continueTokenExpiresAt,
        continueTokenUsedAt: latest.continueTokenUsedAt,
        hasContinueToken: Boolean(latest.continueTokenHash),
      }
    : null;

  const guardians = user.childGuardians.map((link) => ({
    id: link.guardianUser.id,
    email: link.guardianUser.email,
    name: personName(link.guardianUser.firstName, link.guardianUser.lastName, link.guardianUser.email),
    protectionLevel: link.protectionLevel,
    linkedAt: link.linkedAt,
  }));

  const children = user.guardianChildren.map((link) => ({
    id: link.childUser.id,
    email: link.childUser.email,
    name: personName(link.childUser.firstName, link.childUser.lastName, link.childUser.email),
    protectionLevel: link.protectionLevel,
    linkedAt: link.linkedAt,
  }));

  const timeline = buildTimeline(user, guardians);

  return {
    id: user.id,
    email: user.email,
    name: personName(user.firstName, user.lastName, user.email),
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    handle: user.handle,
    accountType: user.accountType,
    ageZoneLabel: user.ageZone ? AGE_ZONE_LABELS[user.ageZone as AgeZoneCode] : "Not set",
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : "",
    country: user.country ?? "",
    countryLabel: user.country ? getCountryLabel(user.country) : "",
    region: user.region ?? "",
    onboardingStep: user.onboardingStep,
    stepLabel: stepLabel(user.onboardingStep),
    emailVerified: Boolean(user.emailVerified),
    emailVerifiedAt: user.emailVerified ? formatStamp(user.emailVerified) : null,
    hasPassword: Boolean(user.passwordHash),
    suspended: Boolean(user.suspendedAt),
    suspendReason: user.suspendReason,
    identityStatus: user.guardianIdentityStatus,
    signupMethod: user.signupMethod,
    createdAt: formatStamp(user.createdAt),
    signedInNow: user.sessions.length > 0,
    postCount,
    ageGate: ageGateSuggestion(user.accountType, user.dateOfBirth),
    guardianEmail: guardians[0]?.email ?? latest?.parentEmail ?? "",
    tokens: tokenHealth({
      emailVerified: user.emailVerified,
      verification: latestVerification,
      request: requestSnapshot,
    }),
    requests: user.parentApprovalRequests.map((request) => ({
      id: request.id,
      status: request.revokedAt ? "REVOKED" : request.status,
      parentEmail: request.parentEmail,
      protectionLevel: request.protectionLevel,
      sentAt: formatStamp(request.sentAt),
      expiresAt: formatStamp(request.expiresAt),
      resolvedAt: request.resolvedAt ? formatStamp(request.resolvedAt) : "—",
      idDocType: request.idDocType,
      guardianCountry: request.guardianCountry,
      guardianRegion: request.guardianRegion,
      childLocation:
        [request.childLocationRegion, request.childLocationCountry].filter(Boolean).join(", ") || "—",
      livesWithGuardian:
        request.childLivesWithGuardian == null ? "—" : request.childLivesWithGuardian ? "Yes" : "No",
    })),
    guardianRequests: user.guardianApprovalRequests.map((request) => ({
      id: request.id,
      childId: request.childUser.id,
      childName: personName(request.childUser.firstName, request.childUser.lastName, request.childUser.email),
      status: request.revokedAt ? "REVOKED" : request.status,
      sentAt: formatStamp(request.sentAt),
    })),
    guardians,
    children,
    timeline,
  };
}

function buildTimeline(
  user: {
    createdAt: Date;
    emailVerified: Date | null;
    onboardingStep: string | null;
    parentApprovalRequests: Array<{
      parentEmail: string;
      status: string;
      sentAt: Date;
      resolvedAt: Date | null;
      revokedAt: Date | null;
      continueTokenUsedAt: Date | null;
    }>;
  },
  guardians: Array<{ name: string; linkedAt: Date }>,
) {
  const events: Array<{ at: Date; label: string }> = [
    { at: user.createdAt, label: "Account created" },
  ];
  if (user.emailVerified) {
    events.push({ at: user.emailVerified, label: "Email verified" });
  }
  for (const request of user.parentApprovalRequests) {
    events.push({ at: request.sentAt, label: `Guardian invite sent to ${request.parentEmail}` });
    if (request.resolvedAt) {
      events.push({
        at: request.resolvedAt,
        label: `Invite ${request.status.toLowerCase()}`,
      });
    }
    if (request.revokedAt) {
      events.push({ at: request.revokedAt, label: "Guardian link removed by an operator" });
    }
    if (request.continueTokenUsedAt) {
      events.push({ at: request.continueTokenUsedAt, label: "Child opened the continue link" });
    }
  }
  for (const guardian of guardians) {
    events.push({ at: guardian.linkedAt, label: `Linked to ${guardian.name}` });
  }
  if (user.onboardingStep === "complete") {
    events.push({ at: user.createdAt, label: "Onboarding marked complete" });
  }
  return events
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .map((event) => ({ at: formatStamp(event.at), label: event.label }));
}

export async function listGuardianChoices() {
  const guardians = await prisma.user.findMany({
    where: { accountType: "GUARDIAN" },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      onboardingStep: true,
      guardianIdentityStatus: true,
    },
  });

  return guardians.map((guardian) => ({
    id: guardian.id,
    email: guardian.email,
    name: personName(guardian.firstName, guardian.lastName, guardian.email),
    complete: guardian.onboardingStep === "complete",
    identityStatus: guardian.guardianIdentityStatus,
  }));
}
