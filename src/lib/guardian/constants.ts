export const ID_CAPTURE_DURATION_MS = 2000;
export const IDENTITY_VERIFY_STEP_DURATION_MS = 2000;

export const ID_DOC_TYPE_LABELS = {
  passport: "Passport",
  "national-id": "National ID",
  "driving-license": "Driving license",
} as const;

export type IdDocType = keyof typeof ID_DOC_TYPE_LABELS;

export const PROTECTION_TIER_LABELS = {
  strict: "Strict",
  standard: "Standard",
  relaxed: "Relaxed",
} as const;

export type ProtectionTier = keyof typeof PROTECTION_TIER_LABELS;

export function getProtectionChecklistItems(tier: ProtectionTier, childFirstName: string) {
  const common = [`${childFirstName} can now log in and explore InrCliq`];

  if (tier === "strict") {
    return [
      ...common,
      "Only curated creators are available",
      "DMs are turned off and comments are hidden",
      "You'll be notified of any safety concerns",
    ];
  }

  if (tier === "relaxed") {
    return [
      ...common,
      "DMs are allowed with standard moderation",
      "Standard content moderation is active",
      "You'll be notified of any safety concerns",
    ];
  }

  return [
    ...common,
    "DMs are restricted to approved contacts only",
    "Comment filter is active, harmful content is blocked",
    "You'll be notified of any safety concerns",
  ];
}

export function maskIdNumber(value: string) {
  if (!value) return "********";
  if (value.length <= 4) return "*".repeat(value.length);
  return `${value.slice(0, 2)}${"*".repeat(Math.max(value.length - 4, 4))}${value.slice(-2)}`;
}

export function simulateExtractedIdNumber(seed: string) {
  const cleaned = seed.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 7);
  const padded = (cleaned + "1234567").slice(0, 7);
  return `AB${padded.slice(2)}`;
}
