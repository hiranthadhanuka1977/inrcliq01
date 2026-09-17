import type { ControlHealthItem } from "@/lib/guardian/family-center-static";
import {
  buildControlHealthForChild,
  type ContactTrustBandId,
  type SafeCircleContact,
} from "@/lib/guardian/family-center-static";
import { dmContactSafetyStatus } from "@/lib/guardian/dm-contact-safety";
import type { FamilyCenterChild } from "@/lib/guardian/family-center";

export type SafetyScoreTone = "excellent" | "good" | "watch" | "danger";

export type TrustSafetyScoreSummary = {
  score: number;
  tone: SafetyScoreTone;
  copy: string;
  items: ControlHealthItem[];
};

const TONE_LABELS: Record<SafetyScoreTone, string> = {
  excellent: "Excellent",
  good: "Good",
  watch: "Low",
  danger: "Danger",
};

const BAND_LABELS: Record<ContactTrustBandId, string> = {
  immediate_family: "Immediate family",
  relatives: "Relatives",
  school_friends: "School friends",
  approved_wider: "Approved friends & adults",
};

/** Prototype/demo scores for linked accounts shown in Family Circle. */
const DEMO_CHILD_SAFETY_SCORES: Record<string, { score: number; tone: SafetyScoreTone }> = {
  alexanders: { score: 33, tone: "watch" },
};

function normalizeChildHandle(handle: string | null): string | null {
  const trimmed = handle?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^@/, "").toLowerCase();
}

export function safetyScoreToneLabel(tone: SafetyScoreTone): string {
  return TONE_LABELS[tone];
}

export function safetyScoreRingCaption(tone: SafetyScoreTone): string | null {
  if (tone === "danger") return "Risk";
  if (tone === "watch") return "Low";
  return null;
}

export function computeSafetySecureScore(items: ControlHealthItem[]): {
  score: number;
  tone: SafetyScoreTone;
} {
  if (items.length === 0) {
    return { score: 0, tone: "watch" };
  }

  const points = items.map((item) => (item.status === "ok" ? 100 : 72));
  const score = Math.round(points.reduce((sum, value) => sum + value, 0) / points.length);
  const tone: SafetyScoreTone = score >= 92 ? "excellent" : score >= 80 ? "good" : "watch";

  return { score, tone };
}

export function computeChildSafetySecureScore(
  child: FamilyCenterChild,
  controlItems: ControlHealthItem[],
): { score: number; tone: SafetyScoreTone } {
  const demoHandle = normalizeChildHandle(child.handle);
  if (demoHandle && DEMO_CHILD_SAFETY_SCORES[demoHandle]) {
    return DEMO_CHILD_SAFETY_SCORES[demoHandle];
  }

  const base = computeSafetySecureScore(controlItems);
  const attentionContacts = child.dmContacts.filter(
    (contact) => dmContactSafetyStatus(contact.id) === "attention",
  ).length;

  if (attentionContacts === 0) {
    return base;
  }

  const penalty = Math.min(12, attentionContacts * 4);
  const score = Math.max(0, base.score - penalty);
  const tone: SafetyScoreTone = score >= 92 ? "excellent" : score >= 80 ? "good" : "watch";

  return { score, tone };
}

function toneForScore(score: number): SafetyScoreTone {
  return score >= 92 ? "excellent" : score >= 80 ? "good" : "watch";
}

function hashScore(seed: string, min: number, span: number) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % 997;
  }
  return min + (hash % (span + 1));
}

/** Trust & safety score for the linked child at the centre of the Safe Contact Circle. */
export function computeChildTrustSafetySummary(child: FamilyCenterChild): TrustSafetyScoreSummary {
  const controlHealth = buildControlHealthForChild(child);
  const { score, tone } = computeChildSafetySecureScore(child, controlHealth.items);
  return {
    score,
    tone,
    copy: `Reflects ${child.firstName}'s ${child.protectionLevelLabel.toLowerCase()} protection settings and active control health.`,
    items: controlHealth.items,
  };
}

/** Prototype trust & safety score for a person plotted on the Safe Contact Circle. */
export function computeSafeCircleContactTrustSummary(
  contact: SafeCircleContact,
  siblings: FamilyCenterChild[],
): TrustSafetyScoreSummary {
  if (contact.kind === "sibling") {
    const siblingId = contact.id.replace(/^sibling:/, "");
    const sibling = siblings.find((child) => child.id === siblingId);
    if (sibling) return computeChildTrustSafetySummary(sibling);
  }

  if (contact.kind === "guardian") {
    return {
      score: 97,
      tone: "excellent",
      copy: `${contact.name} is a linked guardian with full oversight of this family circle.`,
      items: [
        {
          label: "Account role",
          value: "Guardian",
          status: "ok",
          info: "Parent or guardian account linked to this child.",
        },
        {
          label: "Oversight",
          value: "Active",
          status: "ok",
          info: "Can review safety alerts, contacts, and protection settings.",
        },
        {
          label: "Trust band",
          value: BAND_LABELS.immediate_family,
          status: "ok",
          info: "Placed in the closest trust band for this child.",
        },
      ],
    };
  }

  const attention = dmContactSafetyStatus(contact.id) === "attention";
  const score = attention ? hashScore(contact.id, 42, 28) : hashScore(contact.id, 78, 18);
  const tone: SafetyScoreTone = attention ? "watch" : toneForScore(score);
  const bandLabel = BAND_LABELS[contact.band];

  return {
    score,
    tone,
    copy: `Prototype trust and safety score for ${contact.name} based on contact health and trust band.`,
    items: [
      {
        label: "Trust band",
        value: bandLabel,
        status: "ok",
        info: "Relative closeness in this child's approved contact circle.",
      },
      {
        label: "Contact health",
        value: attention ? "Needs review" : "All clear",
        status: attention ? "watch" : "ok",
        info: attention
          ? "Recent signals suggest this contact may need guardian attention."
          : "No open safety concerns for this contact right now.",
      },
      {
        label: "Messaging",
        value: attention ? "Watch" : "Allowed",
        status: attention ? "watch" : "ok",
        info: "Status of direct messaging with this approved contact.",
      },
    ],
  };
}

function hashIndex(seed: string, modulo: number) {
  if (modulo <= 0) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % 997;
  }
  return hash % modulo;
}

/** Pick one circle contact that should carry the red/danger warning for this child. */
export function pickDangerContactIdForChild(
  contacts: SafeCircleContact[],
  childId: string,
): string | null {
  const dmContacts = contacts.filter((contact) => contact.kind === "dm");
  if (dmContacts.length > 0) {
    return dmContacts[hashIndex(`${childId}:danger-dm`, dmContacts.length)]!.id;
  }

  const outerContacts = contacts.filter((contact) => contact.kind !== "guardian");
  if (outerContacts.length > 0) {
    return outerContacts[hashIndex(`${childId}:danger-outer`, outerContacts.length)]!.id;
  }

  return null;
}

/** Force a contact summary into the red/danger prototype state. */
export function toDangerTrustSummary(
  contact: SafeCircleContact,
  base?: TrustSafetyScoreSummary,
): TrustSafetyScoreSummary {
  const bandLabel = BAND_LABELS[contact.band];
  const score = Math.min(base?.score ?? 36, 36);

  return {
    score,
    tone: "danger",
    copy: `${contact.name} has an elevated risk signal that needs guardian review before continued contact.`,
    items: [
      {
        label: "Trust band",
        value: bandLabel,
        status: "ok",
        info: "Relative closeness in this child's approved contact circle.",
      },
      {
        label: "Contact health",
        value: "High risk",
        status: "watch",
        info: "Prototype danger flag assigned so each child circle shows at least one critical warning.",
      },
      {
        label: "Messaging",
        value: "Restricted",
        status: "watch",
        info: "Direct messaging with this contact should be reviewed immediately.",
      },
    ],
  };
}

/** Centre-child danger summary when the circle has no outer contacts to flag. */
export function toChildDangerTrustSummary(
  child: FamilyCenterChild,
  base: TrustSafetyScoreSummary,
): TrustSafetyScoreSummary {
  return {
    score: Math.min(base.score, 34),
    tone: "danger",
    copy: `${child.firstName}'s circle has an elevated safety risk that needs guardian attention.`,
    items: [
      ...base.items.slice(0, 2),
      {
        label: "Risk signal",
        value: "Critical",
        status: "watch",
        info: "Prototype danger flag so each linked child shows at least one red warning.",
      },
    ],
  };
}
