import { evaluateContentSafetyCategories } from "@/lib/moderation/evaluate-predictions";
import {
  getContentSafetyClient,
  getContentSafetyConfig,
  isUnexpected,
} from "@/lib/moderation/azure-content-safety-client";
import type { ImageModerationResult } from "@/lib/moderation/image-moderation-types";

/** Azure Content Safety image limit. */
const AZURE_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
const AZURE_MIN_EDGE = 50;
const AZURE_MAX_EDGE = 7200;

function verificationFailedResult(): ImageModerationResult {
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

function misconfiguredResult(): ImageModerationResult {
  return {
    allowed: false,
    title: "Unable to verify image",
    message:
      "Image safety checking is temporarily unavailable. Please try again in a moment.",
    category: "Neutral",
    confidence: 0,
    predictions: [],
    verificationFailed: true,
  };
}

/**
 * Ensure the image meets Azure Content Safety constraints (size, dimensions)
 * by optionally resizing/re-encoding with Jimp.
 */
async function prepareImageBase64(bytes: Buffer): Promise<string> {
  const { Jimp } = await import("jimp");
  const image = await Jimp.read(bytes);
  let { width, height } = image;

  if (width < AZURE_MIN_EDGE || height < AZURE_MIN_EDGE) {
    const scale = Math.max(AZURE_MIN_EDGE / width, AZURE_MIN_EDGE / height);
    width = Math.max(AZURE_MIN_EDGE, Math.round(width * scale));
    height = Math.max(AZURE_MIN_EDGE, Math.round(height * scale));
    image.resize({ w: width, h: height });
  }

  if (width > AZURE_MAX_EDGE || height > AZURE_MAX_EDGE) {
    const scale = Math.min(AZURE_MAX_EDGE / width, AZURE_MAX_EDGE / height);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
    image.resize({ w: width, h: height });
  }

  let quality = 92;
  let output = await image.getBuffer("image/jpeg", { quality });

  while (output.length > AZURE_IMAGE_MAX_BYTES && quality > 40) {
    quality -= 12;
    output = await image.getBuffer("image/jpeg", { quality });
  }

  if (output.length > AZURE_IMAGE_MAX_BYTES) {
    // Last resort: shrink dimensions further.
    while (output.length > AZURE_IMAGE_MAX_BYTES && (width > AZURE_MIN_EDGE || height > AZURE_MIN_EDGE)) {
      width = Math.max(AZURE_MIN_EDGE, Math.round(width * 0.75));
      height = Math.max(AZURE_MIN_EDGE, Math.round(height * 0.75));
      image.resize({ w: width, h: height });
      output = await image.getBuffer("image/jpeg", { quality: 70 });
    }
  }

  if (output.length > AZURE_IMAGE_MAX_BYTES) {
    throw new Error(`Image exceeds Azure Content Safety size limit after compression (${output.length} bytes).`);
  }

  return output.toString("base64");
}

async function analyzeWithAzure(bytes: Buffer): Promise<ImageModerationResult> {
  if (!getContentSafetyConfig().configured) {
    console.error("[moderation] CONTENT_SAFETY_ENDPOINT / CONTENT_SAFETY_KEY not configured");
    return misconfiguredResult();
  }

  const base64Image = await prepareImageBase64(bytes);
  const client = getContentSafetyClient();
  const result = await client.path("/image:analyze").post({
    body: {
      image: { content: base64Image },
      categories: ["Hate", "SelfHarm", "Sexual", "Violence"],
      outputType: "FourSeverityLevels",
    },
  });

  if (isUnexpected(result)) {
    console.error("[moderation] Azure Content Safety unexpected response", result.status, result.body);
    return verificationFailedResult();
  }

  return evaluateContentSafetyCategories(result.body.categoriesAnalysis ?? []);
}

export async function moderateImageBytes(bytes: Buffer): Promise<ImageModerationResult> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await analyzeWithAzure(bytes);
    } catch (error) {
      console.error(`[moderation] Azure attempt ${attempt + 1} failed`, error);
      if (attempt === 1) break;
    }
  }

  return verificationFailedResult();
}
