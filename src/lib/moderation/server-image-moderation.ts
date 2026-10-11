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

function readWebpDimensions(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.length < 30) return null;
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") return null;

  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8 ") {
    return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === "VP8L") {
    const bits = bytes.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") {
    return { width: bytes.readUIntLE(24, 3) + 1, height: bytes.readUIntLE(27, 3) + 1 };
  }
  return null;
}

/** Jimp cannot decode WebP, but Azure accepts it as-is when within its limits. */
function webpPassthroughBase64(bytes: Buffer): string | null {
  const size = readWebpDimensions(bytes);
  if (!size) return null;
  const { width, height } = size;
  if (
    bytes.length > AZURE_IMAGE_MAX_BYTES ||
    Math.min(width, height) < AZURE_MIN_EDGE ||
    Math.max(width, height) > AZURE_MAX_EDGE
  ) {
    return null;
  }
  return bytes.toString("base64");
}

/**
 * Ensure the image meets Azure Content Safety constraints (size, dimensions)
 * by optionally resizing/re-encoding with Jimp.
 */
async function prepareImageBase64(bytes: Buffer): Promise<string> {
  const { Jimp } = await import("jimp");
  let image: Awaited<ReturnType<typeof Jimp.read>>;
  try {
    image = await Jimp.read(bytes);
  } catch (error) {
    const passthrough = webpPassthroughBase64(bytes);
    if (passthrough) return passthrough;
    throw error;
  }
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
