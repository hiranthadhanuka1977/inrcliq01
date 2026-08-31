import { NextRequest, NextResponse } from "next/server";
import { splitName } from "@/lib/backend/mappers";
import { SSO_PENDING_COOKIE, type PendingSsoRegistration } from "@/lib/backend/sso";

/**
 * GET /api/auth/sso/pending
 *
 * What the provider told us about a user who is mid-signup, so the form can be
 * prefilled. Deliberately never returns the ssoToken — that stays server-side
 * and is redeemed by the signup route.
 */
export async function GET(request: NextRequest) {
  const raw = request.cookies.get(SSO_PENDING_COOKIE)?.value;
  if (!raw) return NextResponse.json({ pending: false });

  try {
    const pending = JSON.parse(raw) as PendingSsoRegistration;
    const { firstName, lastName } = splitName(pending.name ?? "");
    return NextResponse.json({
      pending: true,
      provider: pending.provider,
      email: pending.email,
      firstName,
      lastName,
    });
  } catch {
    return NextResponse.json({ pending: false });
  }
}
