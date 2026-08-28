export type NsfwClassName = "Drawing" | "Hentai" | "Neutral" | "Porn" | "Sexy";

export type ImageModerationPrediction = {
  className: NsfwClassName;
  probability: number;
};

export type ImageModerationBlock = {
  allowed: false;
  title: string;
  message: string;
  category: NsfwClassName;
  confidence: number;
  predictions: ImageModerationPrediction[];
  /** True when the safety model failed — not a content flag. */
  verificationFailed?: boolean;
};

export type ImageModerationResult = { allowed: true } | ImageModerationBlock;
