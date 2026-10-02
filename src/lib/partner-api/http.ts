import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { authenticatePartner, type AuthenticatedPartner } from "@/lib/partner-api/auth";

export type PartnerFieldError = { field: string; message: string };

export type PartnerErrorCode =
  | "validation_failed"
  | "invalid_json"
  | "payload_too_large"
  | "unauthorized"
  | "creator_not_allowed"
  | "members_only_not_allowed"
  | "not_found"
  | "duplicate_external_id"
  | "content_blocked"
  | "moderation_unavailable"
  | "rate_limited"
  | "internal_error";

export function newRequestId() {
  return `req_${randomBytes(6).toString("hex")}`;
}

export function partnerJson(
  requestId: string,
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Request-Id": requestId, ...headers },
  });
}

export function partnerError(
  requestId: string,
  status: number,
  code: PartnerErrorCode,
  message: string,
  extra: { fields?: PartnerFieldError[]; category?: string; headers?: Record<string, string> } = {},
) {
  const { headers, ...details } = extra;
  return partnerJson(requestId, { error: { code, message, ...details }, requestId }, status, headers);
}

export function unauthorizedError(requestId: string) {
  return partnerError(requestId, 401, "unauthorized", "Missing, invalid or revoked API key.", {
    headers: { "WWW-Authenticate": 'Bearer realm="InrCliq Partner API"' },
  });
}

/** Authenticates the request and turns unexpected failures into a 500 carrying the request id. */
export async function withPartner(
  request: Request,
  label: string,
  handler: (partner: AuthenticatedPartner, requestId: string) => Promise<NextResponse>,
) {
  const requestId = newRequestId();
  try {
    const partner = await authenticatePartner(request);
    if (!partner) return unauthorizedError(requestId);
    return await handler(partner, requestId);
  } catch (error) {
    console.error(`${label} error (${requestId})`, error);
    return internalError(requestId);
  }
}

export function internalError(requestId: string) {
  return partnerError(
    requestId,
    500,
    "internal_error",
    "Something went wrong on our side. Quote the requestId if you contact support.",
  );
}
