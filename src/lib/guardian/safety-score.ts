import type { ControlHealthItem } from "@/lib/guardian/family-center-static";
import { dmContactSafetyStatus } from "@/lib/guardian/dm-contact-safety";
import type { FamilyCenterChild } from "@/lib/guardian/family-center";

export type SafetyScoreTone = "excellent" | "good" | "watch";

const TONE_LABELS: Record<SafetyScoreTone, string> = {
  excellent: "Excellent",
  good: "Good",
  watch: "Low",
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
  return tone === "watch" ? "Low" : null;
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
