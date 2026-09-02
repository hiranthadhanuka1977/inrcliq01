import type { ControlHealthItem } from "@/lib/guardian/family-center-static";
import { dmContactSafetyStatus } from "@/lib/guardian/dm-contact-safety";
import type { FamilyCenterChild } from "@/lib/guardian/family-center";

export type SafetyScoreTone = "excellent" | "good" | "watch";

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
