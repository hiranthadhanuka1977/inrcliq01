import { NextResponse } from "next/server";
import { deleteSettingsPartner } from "@/lib/settings/partners";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await deleteSettingsPartner(id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("settings/partners/[id] DELETE error", err);
    return NextResponse.json({ error: "Unable to delete the partner." }, { status: 500 });
  }
}
