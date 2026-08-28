"use client";

import { formatImageModerationError } from "@/lib/moderation/evaluate-predictions";
import type { ImageModerationBlock, ImageModerationResult } from "@/lib/moderation/image-moderation-types";

export type {
  ImageModerationBlock,
  ImageModerationPrediction,
  ImageModerationResult,
  NsfwClassName,
} from "@/lib/moderation/image-moderation-types";

export { formatImageModerationError };

export type ModerateImageFileOutcome = {
  result: ImageModerationResult;
  passToken?: string;
};

export function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  const name = file.name.toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif", ".bmp"].some((ext) =>
    name.endsWith(ext),
  );
}

export function shouldModerateUploadFile(file: File): boolean {
  if (file.type.startsWith("video/")) return false;
  if (isImageFile(file)) return true;
  // Photo pickers on mobile often omit MIME type or extension.
  return !file.type || file.type === "application/octet-stream";
}

function verificationFailedResult(): ImageModerationBlock {
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

export async function moderateImageFile(file: File): Promise<ModerateImageFileOutcome> {
  if (!shouldModerateUploadFile(file)) {
    return { result: { allowed: true } };
  }

  try {
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/feed/moderate-image", { method: "POST", body });
    const data = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      result?: ImageModerationResult;
      passToken?: string;
    };

    if (data.result) {
      return {
        result: data.result,
        passToken: data.passToken,
      };
    }

    if (!response.ok) {
      console.error("Image moderation API failed", response.status, data.error);
    }

    return { result: verificationFailedResult() };
  } catch (error) {
    console.error("Image moderation failed", error);
    return { result: verificationFailedResult() };
  }
}

export async function preloadImageModerationModel(): Promise<void> {
  // Model loads on the server when the moderate-image API is first called.
}
