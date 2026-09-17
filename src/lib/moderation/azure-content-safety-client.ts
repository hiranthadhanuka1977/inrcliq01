import ContentSafetyClient, {
  isUnexpected,
  type ContentSafetyClient as ContentSafetyClientType,
} from "@azure-rest/ai-content-safety";
import { AzureKeyCredential } from "@azure/core-auth";

let client: ContentSafetyClientType | null = null;

export function getContentSafetyConfig() {
  const endpoint = process.env.CONTENT_SAFETY_ENDPOINT?.trim() || "";
  const key = process.env.CONTENT_SAFETY_KEY?.trim() || "";
  return { endpoint, key, configured: Boolean(endpoint && key) };
}

export function getContentSafetyClient(): ContentSafetyClientType {
  const { endpoint, key, configured } = getContentSafetyConfig();
  if (!configured) {
    throw new Error(
      "Azure Content Safety is not configured. Set CONTENT_SAFETY_ENDPOINT and CONTENT_SAFETY_KEY.",
    );
  }

  if (!client) {
    client = ContentSafetyClient(endpoint, new AzureKeyCredential(key));
  }
  return client;
}

export { isUnexpected };
