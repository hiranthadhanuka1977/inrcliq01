import { NextResponse } from "next/server";
import { buildGuardianContext } from "@/lib/auth/guardian-flow";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")?.trim() ?? "";

    if (!token) {
      return NextResponse.json({ error: "Missing approval token." }, { status: 400 });
    }

    const result = await buildGuardianContext(token);

    if (!result.ok) {
      if (result.reason === "resolved") {
        return NextResponse.json(
          { error: "This approval link has already been used.", status: result.status },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: "Invalid or expired approval link." }, { status: 400 });
    }

    return NextResponse.json(result.context);
  } catch (error) {
    console.error("guardian/context error", error);
    return NextResponse.json({ error: "Unable to load approval request." }, { status: 500 });
  }
}
