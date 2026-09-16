export type ContentSafetyCategory = "Hate" | "SelfHarm" | "Sexual" | "Violence" | "Neutral";

/** @deprecated Prefer ContentSafetyCategory — kept for older UI imports. */
export type NsfwClassName = ContentSafetyCategory | "Drawing" | "Hentai" | "Porn" | "Sexy";

export type ImageModerationPrediction = {
  className: ContentSafetyCategory;
  /** Normalized 0–1 confidence derived from Azure severity (severity / 6). */
  probability: number;
  /** Raw Azure severity score (0, 2, 4, or 6). */
  severity: number;
};

export type ImageModerationBlock = {
  allowed: false;
  title: string;
  message: string;
  category: ContentSafetyCategory;
  confidence: number;
  predictions: ImageModerationPrediction[];
  /** True when the safety service failed — not a content flag. */
  verificationFailed?: boolean;
};

export type ImageModerationResult = { allowed: true } | ImageModerationBlock;
