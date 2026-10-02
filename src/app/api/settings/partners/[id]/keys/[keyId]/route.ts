import { NextResponse } from "next/server";
import { revokeSettingsPartnerKey } from "@/lib/settings/partners";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; keyId: string }> },
) {
  try {
    const { id, keyId } = await params;
    const result = await revokeSettingsPartnerKey(id, keyId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("settings/partners/[id]/keys/[keyId] DELETE error", err);
    return NextResponse.json({ error: "Unable to revoke the key." }, { status: 500 });
  }
}
