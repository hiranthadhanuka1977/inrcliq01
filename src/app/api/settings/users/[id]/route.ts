import { NextResponse } from "next/server";
import { deleteSettingsUser } from "@/lib/settings/users";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await deleteSettingsUser(id);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("settings/users/[id] DELETE error", err);
    return NextResponse.json({ error: "Unable to remove user." }, { status: 500 });
  }
}