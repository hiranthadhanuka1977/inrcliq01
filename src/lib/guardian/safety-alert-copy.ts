import type { DmHoldStatus, DmRecipientTreatment, SafetyAlertStatus } from "@/generated/prisma/client";

/** Safe guardian-facing label for a moderation category. Never includes message content. */
export function guardianCategoryLabel(category: string | null | undefined) {
  switch ((category ?? "").trim().toLowerCase()) {
    case "sexual":
      return "Sexual content concern";
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

export function priorityForCategory(category: string | null | undefined): "high" | "medium" {
  const normalized = (category ?? "").trim().toLowerCase();
  if (normalized === "sexual" || normalized === "selfharm" || normalized === "self-harm" || normalized === "violence") {
    return "high";
  }
  return "medium";
}

export function priorityLabel(priority: "high" | "medium") {
  return priority === "high" ? "High priority" : "Medium priority";
}

export const SAFETY_ALERT_STATUS_LABELS: Record<SafetyAlertStatus, string> = {
  AWAITING_DECISION: "Awaiting your decision",
  AWAITING_ACKNOWLEDGEMENT: "Awaiting acknowledgement",
  ACKNOWLEDGED: "Acknowledged",
  ALLOWED: "Allowed — delivered",
  REJECTED: "Rejected — not delivered",
  EXPIRED: "Expired — not delivered",
};

export function holdActionTakenCopy(
  treatment: DmRecipientTreatment,
  childFirstName: string,
  holdStatus: DmHoldStatus = "PENDING",
) {
  const masked = treatment === "MASKED_PLACEHOLDER";
  switch (holdStatus) {
    case "ALLOWED":
      return `The message was delivered to ${childFirstName} after review.`;
    case "REJECTED":
      return masked
        ? `The message was rejected. ${childFirstName} only sees a removed-message notice.`
        : `The message was rejected. ${childFirstName} never saw it.`;
    case "EXPIRED":
      return `No decision was made within 7 days, so the message was not delivered to ${childFirstName}.`;
    default:
      return masked
        ? `The message was hidden. ${childFirstName} sees a masked placeholder until you decide.`
        : `The message was blocked. ${childFirstName} has not seen it.`;
  }
}

export function senderInformationalActionTakenCopy(childFirstName: string) {
  return `${childFirstName} tried to send a message that was flagged. It was held for a safety review instead of being delivered.`;
}

export function maskedDeliveryActionTakenCopy(childFirstName: string, childIsSender: boolean) {
  return childIsSender
    ? `${childFirstName} sent a message that was flagged. The recipient saw a masked version.`
    : `The message was masked so ${childFirstName} did not see the full content.`;
}

export type SafetyDisplayUser = {
  firstName: string | null;
  lastName: string | null;
  email: string;
  handle?: string | null;
  profile?: { displayName: string | null; handle: string | null } | null;
};

export function safetyUserDisplayName(user: SafetyDisplayUser | null | undefined) {
  if (!user) return "Someone";
  const profileName = user.profile?.displayName?.trim();
  if (profileName) return profileName;
  const full = [user.firstName?.trim(), user.lastName?.trim()].filter(Boolean).join(" ");
  if (full) return full;
  return user.email.split("@")[0]?.trim() || "Someone";
}

export function safetyUserFirstName(user: SafetyDisplayUser | null | undefined) {
  const first = user?.firstName?.trim();
  if (first) return first;
  return safetyUserDisplayName(user).split(/\s+/)[0] || "Your child";
}

export function safetyUserHandle(user: SafetyDisplayUser | null | undefined) {
  const raw = user?.profile?.handle?.trim() || user?.handle?.trim();
  if (!raw) return null;
  return raw.startsWith("@") ? raw : `@${raw}`;
}

export const SAFETY_DISPLAY_USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  handle: true,
  dateOfBirth: true,
  accountType: true,
  profile: { select: { displayName: true, handle: true } },
} as const;
