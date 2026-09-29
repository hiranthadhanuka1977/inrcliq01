import {
  ageInYears,
  isMinorAgeZone,
  resolveAgeZoneFromDateOfBirth,
  type AgeZoneCode,
} from "@/lib/utils/age-zone";

/** Sender-facing warning copy when the recipient is under 18. Never reveals category or review. */
export const DM_MINOR_WARNING_COPY = {
  title: "Message blocked",
  message:
    "This message has been blocked due to our policy guidelines when interacting with a minor. You have the option to edit the message or send it anyway.",
  verificationFailedTitle: "Message not sent",
  verificationFailedMessage: "We couldn't run our safety check on this message. Please try again.",
} as const;

export type DmSafetyCategory = "Sexual" | "Hate" | "SelfHarm" | "Violence" | "Neutral";
export type DmSafetySeverity = 0 | 2 | 4 | 6;

export type DmSafetyPolicyInput = {
  flagged: boolean;
  verificationFailed: boolean;
  category: DmSafetyCategory;
  severity: DmSafetySeverity;
  senderZone: AgeZoneCode;
  senderAgeYears: number | null;
  /** Sender is a minor with at least one linked guardian. */
  senderMonitored: boolean;
  recipientZone: AgeZoneCode;
  recipientAgeYears: number | null;
  /** Recipient is a minor with at least one linked guardian other than the sender. */
  recipientMonitored: boolean;
  senderRestrictedFromMinors: boolean;
  /** Sender is a linked guardian of the recipient (a parent messaging their own child). */
  senderIsRecipientGuardian?: boolean;
};

export type DmSafetyOutcome = "deliver" | "restricted" | "warn" | "warn_no_override";

export type DmSendAnywayOutcome =
  | "hold_withheld"
  | "hold_masked_placeholder"
  | "masked_delivery"
  | "not_allowed";

export type DmSafetyDecision = {
  outcome: DmSafetyOutcome;
  onSendAnyway: DmSendAnywayOutcome | null;
  alertPriority: "high" | "medium" | null;
  recordStrike: boolean;
  notifySenderGuardians: boolean;
  autoReport: boolean;
};

const NO_SIDE_EFFECTS = {
  alertPriority: null,
  recordStrike: false,
  notifySenderGuardians: false,
  autoReport: false,
} as const;

function isHighRiskCrossZone(input: DmSafetyPolicyInput) {
  if (input.senderZone === "ADULT" || input.recipientZone !== "KIDS") return false;
  if (input.senderZone === "TEENS" || input.senderZone === "MATURE_TEENS") return true;
  if (input.senderAgeYears == null || input.recipientAgeYears == null) return false;
  return input.senderAgeYears - input.recipientAgeYears >= 3;
}

/** Guardian-review policy for DMs. Rules evaluate top to bottom; first match wins. */
export function evaluateDmSafetyPolicy(input: DmSafetyPolicyInput): DmSafetyDecision {
  const recipientIsMinor = isMinorAgeZone(input.recipientZone);
  const senderIsAdult = input.senderZone === "ADULT";
  const notifySenderGuardians = !senderIsAdult && input.senderMonitored;

  // R1
  if (recipientIsMinor && input.senderRestrictedFromMinors) {
    return { outcome: "restricted", onSendAnyway: "not_allowed", ...NO_SIDE_EFFECTS };
  }

  // R2
  if (!input.flagged && !input.verificationFailed) {
    return { outcome: "deliver", onSendAnyway: null, ...NO_SIDE_EFFECTS };
  }

  // R3
  if (input.verificationFailed && recipientIsMinor) {
    return { outcome: "warn_no_override", onSendAnyway: "not_allowed", ...NO_SIDE_EFFECTS };
  }

  // R4
  if (!recipientIsMinor) {
    return {
      outcome: "warn",
      onSendAnyway: "masked_delivery",
      alertPriority: null,
      recordStrike: false,
      notifySenderGuardians,
      autoReport: false,
    };
  }

  // R5
  if (input.category !== "Sexual") {
    return {
      outcome: "warn",
      onSendAnyway: "masked_delivery",
      alertPriority: "medium",
      recordStrike: false,
      notifySenderGuardians,
      autoReport: false,
    };
  }

  // R6
  if (!input.recipientMonitored) {
    return {
      outcome: "warn_no_override",
      onSendAnyway: "not_allowed",
      alertPriority: null,
      recordStrike: false,
      notifySenderGuardians: false,
      autoReport: senderIsAdult && input.severity === 6,
    };
  }

  // R7 / R8
  const alertPriority =
    senderIsAdult || isHighRiskCrossZone(input) || input.severity >= 4 ? "high" : "medium";
  const autoReport =
    senderIsAdult &&
    (input.recipientZone === "KIDS" || input.recipientZone === "TEENS") &&
    input.severity === 6;

  return {
    outcome: "warn",
    onSendAnyway:
      input.recipientZone === "MATURE_TEENS" ? "hold_masked_placeholder" : "hold_withheld",
    alertPriority,
    recordStrike: senderIsAdult && !input.senderIsRecipientGuardian,
    notifySenderGuardians,
    autoReport,
  };
}

/**
 * Zone used by the DM policy. DOB wins; with no DOB a MINOR account is treated as KIDS
 * (most protective) and anything else as ADULT.
 */
export function resolvePolicyAgeZone(user: {
  dateOfBirth: Date | null;
  accountType: string;
}): { zone: AgeZoneCode; ageYears: number | null } {
  const fromDob = resolveAgeZoneFromDateOfBirth(user.dateOfBirth);
  if (fromDob && user.dateOfBirth) {
    return { zone: fromDob, ageYears: ageInYears(user.dateOfBirth) };
  }
  return { zone: user.accountType === "MINOR" ? "KIDS" : "ADULT", ageYears: null };
}

export function normalizeDmSafetyCategory(category: string | null | undefined): DmSafetyCategory {
  switch ((category ?? "").trim().toLowerCase()) {
    case "sexual":
      return "Sexual";
    case "hate":
      return "Hate";
    case "selfharm":
    case "self-harm":
      return "SelfHarm";
    case "violence":
      return "Violence";
    default:
      return "Neutral";
  }
}

/** Snap a 0–1 moderation confidence onto Azure's FourSeverityLevels scale. */
export function severityFromConfidence(confidence: number | null | undefined): DmSafetySeverity {
  const raw = Math.round((confidence ?? 0) * 6);
  if (raw >= 6) return 6;
  if (raw >= 4) return 4;
  if (raw >= 2) return 2;
  return 0;
}
