import { AccountType } from "@/generated/prisma/client";
import {
  listChildDmContacts,
  type ChildDmContact,
} from "@/lib/guardian/child-detail";
import {
  PROTECTION_TIER_LABELS,
  type ProtectionTier,
} from "@/lib/guardian/constants";
import { ensureChildChatThreadForGuardian } from "@/lib/feed/chat-service";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { calculateAge } from "@/lib/utils/age";

export type FamilyCenterChild = {
  id: string;
  firstName: string;
  fullName: string;
  handle: string | null;
  handleLabel: string;
  age: number | null;
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

export type FamilyCenterData = {
  guardianName: string;
  children: FamilyCenterChild[];
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

export async function getFamilyCenterForSession(): Promise<FamilyCenterData | null> {
  const user = await getSessionUser();
  if (!user || user.accountType !== AccountType.GUARDIAN) return null;

  const guardianName =
    [user.firstName?.trim(), user.lastName?.trim()].filter(Boolean).join(" ") ||
    user.email.split("@")[0] ||
    "Guardian";

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

  return { guardianName, children };
}
