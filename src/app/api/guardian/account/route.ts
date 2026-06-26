import { NextResponse } from "next/server";
import { createGuardianAccount, resolveGuardianToken } from "@/lib/auth/guardian-flow";
import { isPasswordRequirementMet } from "@/lib/form-validation";
import type { IdDocType } from "@/lib/guardian/constants";
import { COUNTRIES, US_STATES } from "@/lib/constants/locations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const country = typeof body.country === "string" ? body.country : "";
    const region = typeof body.region === "string" ? body.region : null;
    const idDocType = typeof body.idDocType === "string" ? (body.idDocType as IdDocType) : undefined;

    if (!token) {
      return NextResponse.json({ error: "Missing approval token." }, { status: 400 });
    }

    const verification = await resolveGuardianToken(token);
    if (!verification.ok) {
      return NextResponse.json({ error: "Invalid or expired approval link." }, { status: 400 });
    }

    if (!isPasswordRequirementMet(password)) {
      return NextResponse.json(
        { error: "Use at least 8 characters with a mix of letters and numbers." },
        { status: 400 },
      );
    }

    if (!COUNTRIES.some((item) => item.code === country)) {
      return NextResponse.json({ error: "Please select a valid country." }, { status: 400 });
    }

    if (country === "US" && (!region || !US_STATES.includes(region as (typeof US_STATES)[number]))) {
      return NextResponse.json({ error: "Please select a valid state." }, { status: 400 });
    }

    const result = await createGuardianAccount(verification.request.id, {
      password,
      country,
      region: country === "US" ? region : null,
      idDocType,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("guardian/account error", error);
    return NextResponse.json({ error: "Unable to create guardian account." }, { status: 500 });
  }
}
