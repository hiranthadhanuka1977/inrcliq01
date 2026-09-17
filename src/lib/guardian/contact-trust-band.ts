import { AccountType } from "@/generated/prisma/client";
import type { ContactTrustBandId } from "@/lib/guardian/family-center-static";
import { CONTACT_TRUST_BANDS } from "@/lib/guardian/family-center-static";
import { prisma } from "@/lib/prisma";

export type ContactTrustBandKind = "dm" | "sibling";

const TRUST_BAND_IDS = new Set(CONTACT_TRUST_BANDS.map((band) => band.id));

export function isContactTrustBandId(value: string): value is ContactTrustBandId {
  return TRUST_BAND_IDS.has(value as ContactTrustBandId);
}

export function siblingContactKey(siblingUserId: string) {
  return `sibling:${siblingUserId}`;
}

export async function listContactTrustBandsForChildren(
  guardianUserId: string,
  childUserIds: string[],
): Promise<Record<string, Record<string, ContactTrustBandId>>> {
  if (childUserIds.length === 0) return {};

  const rows = await prisma.childContactTrustBand.findMany({
    where: {
      guardianUserId,
      childUserId: { in: childUserIds },
    },
    select: {
      childUserId: true,
      contactKey: true,
      trustBand: true,
    },
  });

  const byChild: Record<string, Record<string, ContactTrustBandId>> = {};
  for (const row of rows) {
    if (!isContactTrustBandId(row.trustBand)) continue;
    if (!byChild[row.childUserId]) byChild[row.childUserId] = {};
    byChild[row.childUserId]![row.contactKey] = row.trustBand;
  }
  return byChild;
}

export async function upsertContactTrustBand(input: {
  guardianUserId: string;
  childUserId: string;
  contactKey: string;
  contactKind: ContactTrustBandKind;
  trustBand: ContactTrustBandId;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const guardian = await prisma.user.findUnique({
    where: { id: input.guardianUserId },
    select: { id: true, accountType: true },
  });
  if (!guardian || guardian.accountType !== AccountType.GUARDIAN) {
    return { ok: false, error: "Guardian session required.", status: 401 };
  }

  const childLink = await prisma.guardianChildLink.findUnique({
    where: {
      guardianUserId_childUserId: {
        guardianUserId: input.guardianUserId,
        childUserId: input.childUserId,
      },
    },
    select: { id: true },
  });
  if (!childLink) {
    return { ok: false, error: "Child is not linked to this guardian.", status: 403 };
  }

  if (input.contactKind === "dm") {
    const thread = await prisma.chatThread.findFirst({
      where: {
        id: input.contactKey,
        userId: input.childUserId,
      },
      select: { id: true },
    });
    if (!thread) {
      return { ok: false, error: "Contact thread not found for this child.", status: 404 };
    }
  } else if (input.contactKind === "sibling") {
    const siblingUserId = input.contactKey.replace(/^sibling:/, "");
    if (!siblingUserId || siblingUserId === input.childUserId) {
      return { ok: false, error: "Invalid sibling contact.", status: 400 };
    }
    const siblingLink = await prisma.guardianChildLink.findUnique({
      where: {
        guardianUserId_childUserId: {
          guardianUserId: input.guardianUserId,
          childUserId: siblingUserId,
        },
      },
      select: { id: true },
    });
    if (!siblingLink) {
      return { ok: false, error: "Sibling is not linked to this guardian.", status: 403 };
    }
  } else {
    return { ok: false, error: "Unsupported contact kind.", status: 400 };
  }

  await prisma.childContactTrustBand.upsert({
    where: {
      childUserId_contactKey: {
        childUserId: input.childUserId,
        contactKey: input.contactKey,
      },
    },
    create: {
      guardianUserId: input.guardianUserId,
      childUserId: input.childUserId,
      contactKey: input.contactKey,
      contactKind: input.contactKind,
      trustBand: input.trustBand,
    },
    update: {
      guardianUserId: input.guardianUserId,
      contactKind: input.contactKind,
      trustBand: input.trustBand,
    },
  });

  return { ok: true };
}
