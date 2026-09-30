import { NextResponse } from "next/server";
import { createSettingsPartner } from "@/lib/settings/partners";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { name?: unknown };
    const result = await createSettingsPartner(body.name);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ partnerId: result.partnerId, key: result.key }, { status: 201 });
  } catch (err) {
    console.error("settings/partners POST error", err);
    return NextResponse.json({ error: "Unable to add the partner." }, { status: 500 });
  }
}
