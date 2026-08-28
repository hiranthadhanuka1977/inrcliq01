import type {
  ImageModerationBlock,
  ImageModerationPrediction,
  ImageModerationResult,
  NsfwClassName,
} from "@/lib/moderation/image-moderation-types";

const THRESHOLDS: Record<Exclude<NsfwClassName, "Drawing" | "Neutral">, number> = {
  Porn: 0.35,
  Hentai: 0.35,
  Sexy: 0.7,
};

const EXPLICIT_TOP_CLASS_MIN = 0.28;
const COMBINED_EXPLICIT_MIN = 0.38;

const BLOCK_MESSAGES: Record<Exclude<NsfwClassName, "Drawing" | "Neutral">, { title: string; message: string }> = {
  Porn: {
    title: "Inappropriate image",
    message:
      "Our safety check detected likely explicit adult content in this photo. InrCliq does not allow pornographic images in posts — please choose a different photo.",
  },
  Hentai: {
    title: "Inappropriate image",
    message:
      "Our safety check detected likely explicit illustrated adult content. Please choose a different image that follows community guidelines.",
  },
  Sexy: {
    title: "Image too suggestive",
    message:
      "This photo scored highly for suggestive content and does not meet our posting guidelines. Please choose a less suggestive image.",
  },
};

function normalizeClassName(className: string): NsfwClassName {
  const normalized = className.trim().toLowerCase();
  switch (normalized) {
    case "porn":
      return "Porn";
    case "hentai":
      return "Hentai";
    case "sexy":
      return "Sexy";
    case "drawing":
      return "Drawing";
    default:
      return "Neutral";
  }
}

function probabilityFor(predictions: ImageModerationPrediction[], className: NsfwClassName): number {
  return predictions
    .filter((entry) => normalizeClassName(entry.className) === className)
    .reduce((max, entry) => Math.max(max, entry.probability), 0);
}

function blockResult(
  category: Exclude<NsfwClassName, "Drawing" | "Neutral">,
  confidence: number,
  predictions: ImageModerationPrediction[],
): ImageModerationBlock {
  const copy = BLOCK_MESSAGES[category];
  return {
    allowed: false,
    title: copy.title,
    message: copy.message,
    category,
    confidence,
    predictions,
  };
}

export function evaluatePredictions(predictions: ImageModerationPrediction[]): ImageModerationResult {
  if (!predictions.length) {
    return {
      allowed: false,
      title: "Unable to verify image",
      message:
        "We could not run the safety check on this photo. Please try again or choose a different image.",
      category: "Neutral",
      confidence: 0,
      predictions: [],
    };
  }

  const normalized = predictions.map((entry) => ({
    className: normalizeClassName(entry.className),
    probability: entry.probability,
  }));

  const sorted = [...normalized].sort((a, b) => b.probability - a.probability);
  const top = sorted[0];
  const porn = probabilityFor(normalized, "Porn");
  const hentai = probabilityFor(normalized, "Hentai");

  if (
    (top.className === "Porn" || top.className === "Hentai") &&
    top.probability >= EXPLICIT_TOP_CLASS_MIN
  ) {
    return blockResult(top.className, top.probability, normalized);
  }

  if (porn + hentai >= COMBINED_EXPLICIT_MIN) {
    const category = porn >= hentai ? "Porn" : "Hentai";
    return blockResult(category, Math.max(porn, hentai), normalized);
  }

  const flagged = normalized
    .filter(
      (entry): entry is ImageModerationPrediction & { className: keyof typeof THRESHOLDS } =>
        entry.className in THRESHOLDS &&
        entry.probability >= THRESHOLDS[entry.className as keyof typeof THRESHOLDS],
    )
    .sort((a, b) => b.probability - a.probability);

  if (!flagged.length) {
    return { allowed: true };
  }

  return blockResult(flagged[0].className, flagged[0].probability, normalized);
}

export function formatImageModerationError(result: ImageModerationBlock): string {
  const confidence = Math.round(result.confidence * 100);
  return `${result.title}: ${result.message} (flagged as ${result.category.toLowerCase()}, ${confidence}% confidence)`;
}
