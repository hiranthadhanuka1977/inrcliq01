import { ApprovalStatus } from "@/generated/prisma/client";
import { formatStamp } from "@/lib/admin-portal/stuck";
import { prisma } from "@/lib/prisma";

function personName(firstName: string | null, lastName: string | null, email: string) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || email;
}

export async function listAdminGuardians() {
  const guardians = await prisma.user.findMany({
    where: { accountType: "GUARDIAN" },
    orderBy: { createdAt: "desc" },
    include: {
      guardianChildren: { select: { id: true } },
    },
  });

  const emails = guardians.map((guardian) => guardian.email);
  const openInvites = emails.length
    ? await prisma.parentApprovalRequest.groupBy({
        by: ["parentEmail"],
        where: {
          parentEmail: { in: emails },
          status: ApprovalStatus.PENDING,
          expiresAt: { gt: new Date() },
          revokedAt: null,
        },
        _count: { _all: true },
      })
    : [];
  const openByEmail = new Map(openInvites.map((row) => [row.parentEmail, row._count._all]));

  return guardians.map((guardian) => ({
    id: guardian.id,
    name: personName(guardian.firstName, guardian.lastName, guardian.email),
    email: guardian.email,
    setup: guardian.onboardingStep === "complete" ? "Completed" : "Setup unfinished",
    identity:
      guardian.guardianIdentityStatus === "accepted"
        ? "Accepted"
        : guardian.guardianIdentityStatus === "rejected"
          ? "Rejected"
          : "Not reviewed",
    children: guardian.guardianChildren.length,
    openInvites: openByEmail.get(guardian.email) ?? 0,
    joined: formatStamp(guardian.createdAt),
  }));
}

export async function listConsentRegister(from?: Date, to?: Date) {
  const resolvedAt =
    from || to
      ? {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        }
      : undefined;

  const requests = await prisma.parentApprovalRequest.findMany({
    where: {
      status: ApprovalStatus.APPROVED,
      revokedAt: null,
      resolvedAt,
    },
    orderBy: { resolvedAt: "desc" },
    include: {
      childUser: { select: { id: true, email: true, firstName: true, lastName: true } },
      guardianUser: { select: { id: true, email: true, firstName: true, lastName: true } },
      guardianChildLink: { select: { protectionLevel: true } },
    },
  });

  return requests.map((request) => ({
    childId: request.childUser.id,
    childName: personName(request.childUser.firstName, request.childUser.lastName, request.childUser.email),
    childEmail: request.childUser.email,
    guardianId: request.guardianUser?.id ?? null,
    guardianName: request.guardianUser
      ? personName(request.guardianUser.firstName, request.guardianUser.lastName, request.guardianUser.email)
      : request.parentEmail,
    guardianEmail: request.guardianUser?.email ?? request.parentEmail,
    decidedAt: request.resolvedAt ? formatStamp(request.resolvedAt) : "—",
    protectionLevel: request.guardianChildLink?.protectionLevel ?? request.protectionLevel ?? "—",
    idDocType: request.idDocType ?? "—",
    childLocation:
      [request.childLocationRegion, request.childLocationCountry].filter(Boolean).join(", ") || "—",
    livesWithGuardian:
      request.childLivesWithGuardian == null ? "—" : request.childLivesWithGuardian ? "Yes" : "No",
  }));
}

export function toCsv(headers: string[], rows: string[][]) {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(","));
  return lines.join("\r\n");
}

function csvCell(value: string) {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
