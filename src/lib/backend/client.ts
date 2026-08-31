import { backendUrl } from "./config";

/**
 * Thin client for the InrCliq API.
 *
 * The API wraps successes as `{ success, data, ... }` and failures as
 * `{ statusCode, errorCode, message }`. This unwraps both so route handlers keep
 * returning the flat shapes the prototype's components already expect.
 */
export type BackendResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; errorCode: string; message: string; details: Record<string, unknown> };

export async function callBackend<T = Record<string, unknown>>(
  path: string,
  init: { method?: string; body?: unknown; token?: string } = {},
): Promise<BackendResult<T>> {
  const { method = "GET", body, token } = init;

  let response: Response;
  try {
    response = await fetch(`${backendUrl()}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: "no-store",
    });
  } catch {
    // The API being down must not surface as a 200 with empty data.
    return { ok: false, status: 503, errorCode: "BACKEND_UNREACHABLE", message: "Service unavailable.", details: {} };
  }

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    const { statusCode: _s, errorCode: _e, message: _m, correlationId: _c, timestamp: _t, path: _p, ...details } =
      payload;
    const rawMessage = payload.message;
    return {
      ok: false,
      status: response.status,
      errorCode: typeof payload.errorCode === "string" ? payload.errorCode : "INTERNAL_ERROR",
      // Validation failures arrive as an array of field messages.
      message: Array.isArray(rawMessage) ? String(rawMessage[0]) : String(rawMessage ?? "Something went wrong."),
      details,
    };
  }

  return { ok: true, status: response.status, data: (payload.data ?? payload) as T };
}
