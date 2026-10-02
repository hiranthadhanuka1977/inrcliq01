import { NextResponse } from "next/server";
import { linkSettingsPartnerCreator } from "@/lib/settings/partners";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { handle?: unknown };
    const result = await linkSettingsPartnerCreator(id, body.handle);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("settings/partners/[id]/creators POST error", err);
    return NextResponse.json({ error: "Unable to link the creator." }, { status: 500 });
  }
}
