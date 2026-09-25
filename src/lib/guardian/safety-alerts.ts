import { prisma } from "@/lib/prisma";
import { isUserMinor } from "@/lib/guardian/is-user-minor";

export type FamilySafetyAlertCard = {
  id: string;
  priority: "high" | "medium";
  priorityLabel: string;
  childName: string;
  category: string;
  actionTaken: string;
  timeAgo: string;
  status: string;
};

const ACTION_TAKEN =
  "The message was masked so the young person did not see the full content.";

function guardianCategoryLabel(category: string | null | undefined) {
  switch ((category ?? "").trim().toLowerCase()) {
    case "sexual":
      return "Contact / sexual content concern";
    case "selfharm":
    case "self-harm":
      return "Wellbeing safety concern";
    case "hate":
      return "Hate or harassment concern";
    case "violence":
      return "Violence or harm concern";
    default:
      return "Messaging safety concern";
  }
}

function priorityForCategory(category: string | null | undefined): "high" | "medium" {
  const normalized = (category ?? "").trim().toLowerCase();
  if (normalized === "sexual" || normalized === "selfharm" || normalized === "self-harm" || normalized === "violence") {
    return "high";
  }
  return "medium";
}

function priorityLabel(priority: "high" | "medium") {
  return priority === "high" ? "High priority" : "Medium priority";
}

function statusLabel(status: string) {
  if (status === "acknowledged") return "Acknowledged";
  return "Awaiting acknowledgement";
}

function formatTimeAgo(date: Date) {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 45) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

function childDisplayName(child: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}) {
  const full = [child.firstName?.trim(), child.lastName?.trim()].filter(Boolean).join(" ");
  if (full) return full;
  return child.email.split("@")[0]?.trim() || "Linked account";
}

function isMissingAlertModel(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("GuardianSafetyAlert") ||
    message.includes("guardianSafetyAlert") ||
    message.includes("does not exist")
  );
}

/**
 * Create guardian safety alerts when a masked DM involves a linked minor.
 * Never stores raw message text — category + safe action summary only.
 */
export async function createDmModerationSafetyAlerts(input: {
  senderUserId: string;
  receiverUserId: string | null;
  chatThreadId: string;
  chatMessageId: string;
  category: string | null | undefined;
}) {
  try {
    if (typeof prisma.guardianSafetyAlert?.upsert !== "function") return;

    const childIds = new Set<string>();
    if (await isUserMinor(input.senderUserId)) childIds.add(input.senderUserId);
    if (
      input.receiverUserId &&
      input.receiverUserId !== input.senderUserId &&
      (await isUserMinor(input.receiverUserId))
    ) {
      childIds.add(input.receiverUserId);
    }
    if (childIds.size === 0) return;

    const category = guardianCategoryLabel(input.category);
    const priority = priorityForCategory(input.category);

    for (const childUserId of childIds) {
      const links = await prisma.guardianChildLink.findMany({
        where: { childUserId },
        select: { guardianUserId: true },
      });
      if (links.length === 0) continue;

      const peerUserId =
        childUserId === input.senderUserId ? input.receiverUserId : input.senderUserId;

      await Promise.all(
        links.map((link) =>
          prisma.guardianSafetyAlert.upsert({
            where: {
              guardianUserId_chatMessageId: {
                guardianUserId: link.guardianUserId,
                chatMessageId: input.chatMessageId,
              },
            },
            create: {
              guardianUserId: link.guardianUserId,
              childUserId,
              priority,
              category,
              actionTaken: ACTION_TAKEN,
              status: "awaiting_acknowledgement",
              source: "dm_text_moderation",
              chatThreadId: input.chatThreadId,
              chatMessageId: input.chatMessageId,
              peerUserId: peerUserId ?? null,
            },
            update: {},
          }),
        ),
      );
    }
  } catch (error) {
    if (isMissingAlertModel(error)) {
      console.warn("GuardianSafetyAlert model unavailable; skipping safety alert create");
      return;
    }
    console.error("createDmModerationSafetyAlerts failed", error);
  }
}

export async function listSafetyAlertCardsForGuardian(
  guardianUserId: string,
): Promise<FamilySafetyAlertCard[]> {
  try {
    if (typeof prisma.guardianSafetyAlert?.findMany !== "function") return [];

    const rows = await prisma.guardianSafetyAlert.findMany({
      where: { guardianUserId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        child: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return rows.map((row) => {
      const priority = row.priority === "medium" ? "medium" : "high";
      return {
        id: row.id,
        priority,
        priorityLabel: priorityLabel(priority),
        childName: childDisplayName(row.child),
        category: row.category,
        actionTaken: row.actionTaken,
        timeAgo: formatTimeAgo(row.createdAt),
        status: statusLabel(row.status),
      };
    });
  } catch (error) {
    if (isMissingAlertModel(error)) return [];
    console.error("listSafetyAlertCardsForGuardian failed", error);
    return [];
  }
}

function dayLabelFor(date: Date) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfThat = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfThat.getTime()) / 86_400_000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "Earlier this week";
  if (diffDays < 14) return "Last week";
  return "Earlier";
}

/** Map persisted safety alerts into Family Circle activity-log entries. */
export async function listSafetyActivityItemsForGuardian(
  guardianUserId: string,
): Promise<import("@/lib/guardian/family-center-static").FamilyActivityItem[]> {
  try {
    if (typeof prisma.guardianSafetyAlert?.findMany !== "function") return [];

    const rows = await prisma.guardianSafetyAlert.findMany({
      where: { guardianUserId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        child: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return rows.map((row) => {
      const childName = childDisplayName(row.child);
      const acknowledged = row.status === "acknowledged";
      return {
        id: `safety-alert-${row.id}`,
        childId: row.childUserId,
        type: "safety" as const,
        childName,
        title: acknowledged ? "Safety alert acknowledged" : "Safety alert raised",
        detail: acknowledged
          ? `You reviewed a ${row.category.toLowerCase()} alert. ${row.actionTaken}`
          : `${row.category} detected. ${row.actionTaken}`,
        timeAgo: formatTimeAgo(row.createdAt),
        dayLabel: dayLabelFor(row.createdAt),
      };
    });
  } catch (error) {
    if (isMissingAlertModel(error)) return [];
    console.error("listSafetyActivityItemsForGuardian failed", error);
    return [];
  }
}

export async function countUnresolvedSafetyAlerts(guardianUserId: string) {
  try {
    if (typeof prisma.guardianSafetyAlert?.count !== "function") return 0;
    return prisma.guardianSafetyAlert.count({
      where: {
        guardianUserId,
        status: "awaiting_acknowledgement",
      },
    });
  } catch (error) {
    if (isMissingAlertModel(error)) return 0;
    console.error("countUnresolvedSafetyAlerts failed", error);
    return 0;
  }
}

export async function acknowledgeSafetyAlert(guardianUserId: string, alertId: string) {
  if (typeof prisma.guardianSafetyAlert?.updateMany !== "function") {
    return { ok: false as const, status: 503, error: "Safety alerts are not ready." };
  }

  const result = await prisma.guardianSafetyAlert.updateMany({
    where: {
      id: alertId,
      guardianUserId,
      status: "awaiting_acknowledgement",
    },
    data: {
      status: "acknowledged",
      acknowledgedAt: new Date(),
    },
  });

  if (result.count === 0) {
    return { ok: false as const, status: 404, error: "Alert not found." };
  }

  return { ok: true as const };
}
