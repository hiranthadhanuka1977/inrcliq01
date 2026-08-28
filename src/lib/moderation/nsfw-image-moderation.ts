"use client";

import { evaluatePredictions, formatImageModerationError } from "@/lib/moderation/evaluate-predictions";
import type { ImageModerationBlock, ImageModerationResult } from "@/lib/moderation/image-moderation-types";

export type {
  ImageModerationBlock,
  ImageModerationPrediction,
  ImageModerationResult,
  NsfwClassName,
} from "@/lib/moderation/image-moderation-types";

export { formatImageModerationError };

type NsfwModel = {
  classify: (
    img: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
    topK?: number,
  ) => Promise<import("@/lib/moderation/image-moderation-types").ImageModerationPrediction[]>;
};

let modelPromise: Promise<NsfwModel> | null = null;

async function loadModerationModel(): Promise<NsfwModel> {
  if (typeof window === "undefined") {
    throw new Error("Image moderation runs in the browser only.");
  }

  if (!modelPromise) {
    modelPromise = (async () => {
      try {
        const tf = await import("@tensorflow/tfjs");
        await import("@tensorflow/tfjs-backend-webgl");
        if (!tf.getBackend()) {
          await tf.setBackend("webgl");
        }
        await tf.ready();
        const nsfwjs = await import("nsfwjs");
        return (await nsfwjs.load()) as NsfwModel;
      } catch (error) {
        modelPromise = null;
        throw error;
      }
    })();
  }

  return modelPromise;
}

function fileToImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read this image file."));
    };
    image.src = objectUrl;
  });
}

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

export async function moderateImageFile(file: File): Promise<ImageModerationResult> {
  if (!shouldModerateUploadFile(file)) {
    return { allowed: true };
  }

  try {
    const [model, image] = await Promise.all([loadModerationModel(), fileToImageElement(file)]);
    const predictions = await model.classify(image, 5);
    return evaluatePredictions(predictions);
  } catch (error) {
    console.error("Image moderation failed", error);
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
}

export async function preloadImageModerationModel(): Promise<void> {
  try {
    await loadModerationModel();
  } catch (error) {
    console.error("Failed to preload image moderation model", error);
  }
}
