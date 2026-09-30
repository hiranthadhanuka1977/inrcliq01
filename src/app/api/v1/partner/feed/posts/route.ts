import { partnerError, partnerJson, withPartner } from "@/lib/partner-api/http";
import { parsePartnerPost } from "@/lib/partner-api/input";
import { createPartnerPost, serializePartnerPost } from "@/lib/partner-api/posts";

const MAX_BODY_BYTES = 100_000;

export async function POST(request: Request) {
  return withPartner(request, "POST /api/v1/partner/feed/posts", async (partner, requestId) => {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > MAX_BODY_BYTES) {
      return partnerError(requestId, 413, "payload_too_large", `Request body must be under ${MAX_BODY_BYTES} bytes.`);
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return partnerError(requestId, 400, "invalid_json", "Request body must be valid JSON.");
    }

    const parsed = parsePartnerPost(body);
    if (!parsed.ok) {
      const count = parsed.fields.length;
      return partnerError(requestId, 400, "validation_failed", `${count} ${count === 1 ? "field is" : "fields are"} invalid.`, {
        fields: parsed.fields,
      });
    }

    const result = await createPartnerPost(partner, parsed.input);
    if (!result.ok) {
      return partnerError(requestId, result.status, result.code, result.message, {
        ...(result.category ? { category: result.category } : {}),
        ...(result.retryAfterSeconds ? { headers: { "Retry-After": String(result.retryAfterSeconds) } } : {}),
      });
    }

    return partnerJson(requestId, serializePartnerPost(result.post), result.created ? 201 : 200);
  });
}
