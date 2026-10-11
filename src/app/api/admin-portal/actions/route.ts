import { NextResponse } from "next/server";
import { runAdminAction } from "@/lib/admin-portal/actions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await runAdminAction(body);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, message: result.message });
  } catch (error) {
    console.error("admin-portal/actions error", error);
    return NextResponse.json({ error: "Unable to complete that action." }, { status: 500 });
  }
}
