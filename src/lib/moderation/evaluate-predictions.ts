import type {
  ContentSafetyCategory,
  ImageModerationBlock,
  ImageModerationPrediction,
  ImageModerationResult,
} from "@/lib/moderation/image-moderation-types";

const CONTENT_CATEGORIES = ["Hate", "SelfHarm", "Sexual", "Violence"] as const satisfies readonly ContentSafetyCategory[];

const BLOCK_MESSAGES: Record<
  Exclude<ContentSafetyCategory, "Neutral">,
  { title: string; message: string }
> = {
  Hate: {
    title: "Image not allowed",
    message:
      "Our safety check flagged hate-related content in this photo. Please choose a different image that follows community guidelines.",
  },
  SelfHarm: {
    title: "Image not allowed",
    message:
      "Our safety check flagged self-harm related content in this photo. Please choose a different image.",
  },
  Sexual: {
    title: "Inappropriate image",
    message:
      "Our safety check detected sexual or explicit content in this photo. InrCliq does not allow that in posts — please choose a different photo.",
  },
  Violence: {
    title: "Image not allowed",
    message:
      "Our safety check flagged violent content in this photo. Please choose a different image that follows community guidelines.",
  },
};

function defaultBlockSeverity(): number {
  const raw = process.env.CONTENT_SAFETY_BLOCK_SEVERITY?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : 2;
  if (parsed === 2 || parsed === 4 || parsed === 6) return parsed;
  return 2;
}

function thresholdFor(category: Exclude<ContentSafetyCategory, "Neutral">): number {
  const envKey = `CONTENT_SAFETY_BLOCK_SEVERITY_${category.toUpperCase()}`;
  const raw = process.env[envKey]?.trim();
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (parsed === 2 || parsed === 4 || parsed === 6) return parsed;
  }
  // Sexual content is blocked at a lower bar by default for feed uploads.
  if (category === "Sexual") return Math.min(defaultBlockSeverity(), 2);
  return defaultBlockSeverity();
}

function normalizeCategory(value: string): ContentSafetyCategory {
  switch (value.trim().toLowerCase()) {
    case "hate":
      return "Hate";
    case "selfharm":
    case "self-harm":
      return "SelfHarm";
    case "sexual":
      return "Sexual";
    case "violence":
      return "Violence";
    default:
      return "Neutral";
  }
}

function blockResult(
  category: Exclude<ContentSafetyCategory, "Neutral">,
  severity: number,
  predictions: ImageModerationPrediction[],
): ImageModerationBlock {
  const copy = BLOCK_MESSAGES[category];
  return {
    allowed: false,
    title: copy.title,
    message: copy.message,
    category,
    confidence: severity / 6,
    predictions,
  };
}

export function evaluateContentSafetyCategories(
  analysis: Array<{ category?: string | null; severity?: number | null }>,
): ImageModerationResult {
  if (!analysis.length) {
    return {
      allowed: false,
      title: "Unable to verify image",
      message:
        "We could not run the safety check on this photo. Please try again or choose a different image.",
      category: "Neutral",
      confidence: 0,
      predictions: [],
      verificationFailed: true,
    };
  }

  const predictions: ImageModerationPrediction[] = analysis.map((entry) => {
    const category = normalizeCategory(entry.category ?? "");
    const severity = typeof entry.severity === "number" ? entry.severity : 0;
    return {
      className: category,
      severity,
      probability: Math.max(0, Math.min(1, severity / 6)),
    };
  });

  const flagged = CONTENT_CATEGORIES.map((category) => {
    const match = predictions.find((entry) => entry.className === category);
    const severity = match?.severity ?? 0;
    return { category, severity };
  })
    .filter((entry) => entry.severity >= thresholdFor(entry.category))
    .sort((a, b) => b.severity - a.severity);

  if (!flagged.length) {
    return { allowed: true };
  }

  const top = flagged[0]!;
  return blockResult(top.category, top.severity, predictions);
}

/** @deprecated Use evaluateContentSafetyCategories for Azure results. */
export function evaluatePredictions(predictions: ImageModerationPrediction[]): ImageModerationResult {
  return evaluateContentSafetyCategories(
    predictions.map((entry) => ({
      category: entry.className,
      severity: entry.severity ?? Math.round((entry.probability ?? 0) * 6),
    })),
  );
}

export function formatImageModerationError(result: ImageModerationBlock): string {
  if (result.verificationFailed) {
    return `${result.title}: ${result.message}`;
  }
  const severity = Math.round(result.confidence * 6);
  return `${result.title}: ${result.message} (flagged as ${result.category.toLowerCase()}, severity ${severity}/6)`;
}
