import { cache } from "react";
import { AccountType } from "@/generated/prisma/client";
import {
  listChildDmContacts,
  type ChildDmContact,
} from "@/lib/guardian/child-detail";
import { listContactTrustBandsForChildren } from "@/lib/guardian/contact-trust-band";
import type { ContactTrustBandId } from "@/lib/guardian/family-center-static";
import {
  PROTECTION_TIER_LABELS,
  type ProtectionTier,
} from "@/lib/guardian/constants";
import { ensureChildChatThreadForGuardian } from "@/lib/feed/chat-service";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { calculateAge } from "@/lib/utils/age";
import {
  AGE_ZONE_DESCRIPTIONS,
  resolveAgeZoneFromDateOfBirth,
  type AgeZoneCode,
} from "@/lib/utils/age-zone";
import { listAgeZoneDefinitions } from "@/lib/guardian/user-age-zone";

export type FamilyCenterChild = {
  id: string;
  firstName: string;
  fullName: string;
  handle: string | null;
  handleLabel: string;
  age: number | null;
  ageZone: AgeZoneCode | null;
  ageZoneLabel: string | null;
  ageZoneIconBadgeKey: string | null;
  ageZoneIntro: string | null;
  protectionLevel: ProtectionTier | null;
  protectionLevelLabel: string;
  linkedAt: string;
  linkedAtDisplay: string;
  profileHref: string | null;
  avatarInitials: string;
  avatarColor: string;
  avatarUrl: string | null;
  onboardingStep: string | null;
  statusLabel: string;
  messagesHref: string;
  dmContacts: Pick<ChildDmContact, "id" | "name" | "avatarInitials" | "avatarColor" | "avatarUrl">[];
};

export type FamilyCenterGuardian = {
  id: string;
  name: string;
  firstName: string;
  avatarInitials: string;
  avatarColor: string;
  avatarUrl: string | null;
};

export type FamilyCenterData = {
  guardianName: string;
  guardian: FamilyCenterGuardian;
  children: FamilyCenterChild[];
  /** Persisted Safe Contact Circle band assignments, keyed by child id then contact key. */
  contactTrustBandsByChild: Record<string, Record<string, ContactTrustBandId>>;
};

function childFullName(firstName: string | null, lastName: string | null, email: string) {
  const full = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ");
  if (full) return full;
  const local = email.split("@")[0]?.trim();
  return local || "Child";
}

function childInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "C";
}

function childStatusLabel(onboardingStep: string | null) {
  if (onboardingStep === "complete") return "Active";
  if (onboardingStep === "approved") return "Approved — finishing setup";
  return "Pending setup";
}

export const getFamilyCenterForSession = cache(async function getFamilyCenterForSession(): Promise<FamilyCenterData | null> {
  const user = await getSessionUser();
  if (!user || user.accountType !== AccountType.GUARDIAN) return null;

  const guardianName =
    [user.firstName?.trim(), user.lastName?.trim()].filter(Boolean).join(" ") ||
    user.email.split("@")[0] ||
    "Guardian";

  const guardianProfile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
    select: {
      displayName: true,
      avatarUrl: true,
      avatarColor: true,
      avatarInitials: true,
    },
  });

  const guardianFirstName = user.firstName?.trim() || guardianName.split(/\s+/)[0] || "Guardian";
  const guardian: FamilyCenterGuardian = {
    id: user.id,
    name: guardianProfile?.displayName?.trim() || guardianName,
    firstName: guardianFirstName,
    avatarInitials:
      guardianProfile?.avatarInitials?.trim() ||
      childInitials(guardianProfile?.displayName?.trim() || guardianName),
    avatarColor: guardianProfile?.avatarColor?.trim() || "#0d9488",
    avatarUrl: guardianProfile?.avatarUrl?.trim() || null,
  };

  const links = await prisma.guardianChildLink.findMany({
    where: { guardianUserId: user.id },
    orderBy: { linkedAt: "desc" },
    include: {
      childUser: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          handle: true,
          dateOfBirth: true,
          onboardingStep: true,
          profile: {
            select: {
              slug: true,
              displayName: true,
              avatarUrl: true,
              avatarColor: true,
              avatarInitials: true,
            },
          },
        },
      },
    },
  });

  const ageZoneDefinitions = await listAgeZoneDefinitions();
  const ageZoneByCode = Object.fromEntries(
    ageZoneDefinitions.map((definition) => [definition.zone, definition]),
  ) as Partial<Record<AgeZoneCode, (typeof ageZoneDefinitions)[number]>>;

  const children: FamilyCenterChild[] = await Promise.all(
    links.map(async (link) => {
      const child = link.childUser;
      const fullName =
        child.profile?.displayName?.trim() ||
        childFullName(child.firstName, child.lastName, child.email);
      const firstName = child.firstName?.trim() || fullName.split(/\s+/)[0] || "Child";
      const handle = child.handle?.trim() || child.profile?.slug?.trim() || null;
      const handleLabel = handle ? `@${handle.replace(/^@/, "")}` : "No handle";

      let age: number | null = null;
      if (child.dateOfBirth) {
        age = calculateAge(
          child.dateOfBirth.getMonth() + 1,
          child.dateOfBirth.getDate(),
          child.dateOfBirth.getFullYear(),
        );
      }

      const ageZone = resolveAgeZoneFromDateOfBirth(child.dateOfBirth);
      const ageZoneDefinition = ageZone ? ageZoneByCode[ageZone] : null;

      const tier =
        link.protectionLevel && link.protectionLevel in PROTECTION_TIER_LABELS
          ? (link.protectionLevel as ProtectionTier)
          : null;

      const linkedAt = link.linkedAt;
      const slug = child.profile?.slug?.trim() || null;
      const avatarInitials = child.profile?.avatarInitials?.trim() || childInitials(fullName);
      const avatarColor = child.profile?.avatarColor?.trim() || "#6b9fff";
      const avatarUrl = child.profile?.avatarUrl?.trim() || null;

      const thread = await ensureChildChatThreadForGuardian(user.id, {
        childUserId: child.id,
        fullName,
        handleLabel,
        avatarInitials,
        avatarColor,
        avatarUrl,
        slug,
      });

      const dmContacts = await listChildDmContacts(child.id, firstName);

      return {
        id: child.id,
        firstName,
        fullName,
        handle,
        handleLabel,
        age,
        ageZone,
        ageZoneLabel: ageZoneDefinition?.label ?? null,
        ageZoneIconBadgeKey: ageZoneDefinition?.iconBadgeKey ?? null,
        ageZoneIntro:
          ageZoneDefinition?.description ??
          (ageZone ? AGE_ZONE_DESCRIPTIONS[ageZone] : null),
        protectionLevel: tier,
        protectionLevelLabel: tier ? PROTECTION_TIER_LABELS[tier] : "Not set",
        linkedAt: linkedAt.toISOString(),
        linkedAtDisplay: linkedAt.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
        profileHref: slug ? `/feed/profile/${slug}` : null,
        avatarInitials,
        avatarColor,
        avatarUrl,
        onboardingStep: child.onboardingStep,
        statusLabel: childStatusLabel(child.onboardingStep),
        messagesHref: `/feed/messages?thread=${thread.id}`,
        dmContacts: dmContacts.map(({ id, name, avatarInitials, avatarColor, avatarUrl }) => ({
          id,
          name,
          avatarInitials,
          avatarColor,
          avatarUrl,
        })),
      };
    }),
  );

  const contactTrustBandsByChild = await listContactTrustBandsForChildren(
    user.id,
    children.map((child) => child.id),
  );

  return { guardianName, guardian, children, contactTrustBandsByChild };
});
