import type {
  ContentSafetyCategory,
  ImageModerationBlock,
  ImageModerationPrediction,
  ImageModerationResult,
} from "@/lib/moderation/image-moderation-types";

export type ContentModerationKind = "image" | "text" | "dm";

const CONTENT_CATEGORIES = ["Hate", "SelfHarm", "Sexual", "Violence"] as const satisfies readonly ContentSafetyCategory[];

const IMAGE_BLOCK_MESSAGES: Record<
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

const TEXT_BLOCK_MESSAGES: Record<
  Exclude<ContentSafetyCategory, "Neutral">,
  { title: string; message: string }
> = {
  Hate: {
    title: "Post text not allowed",
    message:
      "Our safety check flagged hate-related language in your post. Please revise the text before publishing.",
  },
  SelfHarm: {
    title: "Post text not allowed",
    message:
      "Our safety check flagged self-harm related language in your post. Please revise the text before publishing.",
  },
  Sexual: {
    title: "Post text not allowed",
    message:
      "Our safety check flagged sexual or explicit language in your post. Please revise the text to follow community guidelines.",
  },
  Violence: {
    title: "Post text not allowed",
    message:
      "Our safety check flagged violent language in your post. Please revise the text before publishing.",
  },
};

const DM_BLOCK_MESSAGES: Record<
  Exclude<ContentSafetyCategory, "Neutral">,
  { title: string; message: string }
> = {
  Hate: {
    title: "Message may not be appropriate",
    message:
      "Our safety check flagged hate-related language in this message. You can edit it or send it anyway — if you send it, the recipient will see a masked message.",
  },
  SelfHarm: {
    title: "Message may not be appropriate",
    message:
      "Our safety check flagged self-harm related language in this message. You can edit it or send it anyway — if you send it, the recipient will see a masked message.",
  },
  Sexual: {
    title: "Message may not be appropriate",
    message:
      "Our safety check flagged sexual or explicit language in this message. You can edit it or send it anyway — if you send it, the recipient will see a masked message.",
  },
  Violence: {
    title: "Message may not be appropriate",
    message:
      "Our safety check flagged violent language in this message. You can edit it or send it anyway — if you send it, the recipient will see a masked message.",
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
  if (category === "Sexual") return Math.min(defaultBlockSeverity(), 2);
  return defaultBlockSeverity();
}

export function normalizeContentSafetyCategory(value: string): ContentSafetyCategory {
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

function blockMessages(kind: ContentModerationKind) {
  if (kind === "dm") return DM_BLOCK_MESSAGES;
  return kind === "text" ? TEXT_BLOCK_MESSAGES : IMAGE_BLOCK_MESSAGES;
}

function verificationFailedResult(kind: ContentModerationKind): ImageModerationBlock {
  if (kind === "text" || kind === "dm") {
    return {
      allowed: false,
      title: kind === "dm" ? "Unable to verify message" : "Unable to verify post text",
      message:
        kind === "dm"
          ? "We could not run the safety check on this message. You can try again, or send it anyway."
          : "We could not run the safety check on your post text. Please try again in a moment.",
      category: "Neutral",
      confidence: 0,
      predictions: [],
      verificationFailed: true,
    };
  }
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

function blockResult(
  kind: ContentModerationKind,
  category: Exclude<ContentSafetyCategory, "Neutral">,
  severity: number,
  predictions: ImageModerationPrediction[],
): ImageModerationBlock {
  const copy = blockMessages(kind)[category];
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
  kind: ContentModerationKind = "image",
): ImageModerationResult {
  if (!analysis.length) {
    return verificationFailedResult(kind);
  }

  const predictions: ImageModerationPrediction[] = analysis.map((entry) => {
    const category = normalizeContentSafetyCategory(entry.category ?? "");
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
  return blockResult(kind, top.category, top.severity, predictions);
}

/** @deprecated Use evaluateContentSafetyCategories for Azure results. */
export function evaluatePredictions(predictions: ImageModerationPrediction[]): ImageModerationResult {
  return evaluateContentSafetyCategories(
    predictions.map((entry) => ({
      category: entry.className,
      severity: entry.severity ?? Math.round((entry.probability ?? 0) * 6),
    })),
    "image",
  );
}

export function formatImageModerationError(result: ImageModerationBlock): string {
  if (result.verificationFailed) {
    return `${result.title}: ${result.message}`;
  }
  const severity = Math.round(result.confidence * 6);
  return `${result.title}: ${result.message} (flagged as ${result.category.toLowerCase()}, severity ${severity}/6)`;
}

export const formatContentModerationError = formatImageModerationError;
