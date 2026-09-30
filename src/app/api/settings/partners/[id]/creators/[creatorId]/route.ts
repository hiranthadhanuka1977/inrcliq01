import { NextResponse } from "next/server";
import { unlinkSettingsPartnerCreator } from "@/lib/settings/partners";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; creatorId: string }> },
) {
  try {
    const { id, creatorId } = await params;
    const result = await unlinkSettingsPartnerCreator(id, creatorId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("settings/partners/[id]/creators/[creatorId] DELETE error", err);
    return NextResponse.json({ error: "Unable to unlink the creator." }, { status: 500 });
  }
}
