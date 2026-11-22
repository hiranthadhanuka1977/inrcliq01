import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import { submitAdultIdentity } from "@/lib/auth/adult-identity";

export async function POST() {
  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;

    const result = await submitAdultIdentity(user);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/seller/membership/identity error", err);
    return NextResponse.json({ error: "Unable to save age verification." }, { status: 500 });
  }
}
