import { NextResponse } from "next/server";
import { issueSettingsPartnerKey } from "@/lib/settings/partners";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await issueSettingsPartnerKey(id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ key: result.key }, { status: 201 });
  } catch (err) {
    console.error("settings/partners/[id]/keys POST error", err);
    return NextResponse.json({ error: "Unable to create a key." }, { status: 500 });
  }
}
