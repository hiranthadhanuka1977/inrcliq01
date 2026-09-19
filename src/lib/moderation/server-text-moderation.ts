import { evaluateContentSafetyCategories } from "@/lib/moderation/evaluate-predictions";
import {
  getContentSafetyClient,
  getContentSafetyConfig,
  isUnexpected,
} from "@/lib/moderation/azure-content-safety-client";
import type { ImageModerationResult } from "@/lib/moderation/image-moderation-types";

/** Azure Content Safety text limit (unicode code points). */
const AZURE_TEXT_MAX_CHARS = 10_000;

function verificationFailedResult(kind: "text" | "dm"): ImageModerationResult {
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

function misconfiguredResult(kind: "text" | "dm"): ImageModerationResult {
  return {
    allowed: false,
    title: kind === "dm" ? "Unable to verify message" : "Unable to verify post text",
    message:
      kind === "dm"
        ? "Message safety checking is temporarily unavailable. You can try again, or send it anyway."
        : "Text safety checking is temporarily unavailable. Please try again in a moment.",
    category: "Neutral",
    confidence: 0,
    predictions: [],
    verificationFailed: true,
  };
}

function truncateForAzure(text: string) {
  if ([...text].length <= AZURE_TEXT_MAX_CHARS) return text;
  return [...text].slice(0, AZURE_TEXT_MAX_CHARS).join("");
}

export async function moderatePostText(
  text: string,
  kind: "text" | "dm" = "text",
): Promise<ImageModerationResult> {
  const trimmed = text.replace(/\r\n/g, "\n").trim();
  if (!trimmed) {
    return { allowed: true };
  }

  if (!getContentSafetyConfig().configured) {
    console.error("[moderation] CONTENT_SAFETY_ENDPOINT / CONTENT_SAFETY_KEY not configured");
    return misconfiguredResult(kind);
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const client = getContentSafetyClient();
      const result = await client.path("/text:analyze").post({
        body: {
          text: truncateForAzure(trimmed),
          categories: ["Hate", "SelfHarm", "Sexual", "Violence"],
          outputType: "FourSeverityLevels",
        },
      });

      if (isUnexpected(result)) {
        console.error("[moderation] Azure text unexpected response", result.status, result.body);
        if (attempt === 0) continue;
        return verificationFailedResult(kind);
      }

      return evaluateContentSafetyCategories(result.body.categoriesAnalysis ?? [], kind);
    } catch (error) {
      console.error(`[moderation] Azure text attempt ${attempt + 1} failed`, error);
      if (attempt === 1) break;
    }
  }

  return verificationFailedResult(kind);
}
