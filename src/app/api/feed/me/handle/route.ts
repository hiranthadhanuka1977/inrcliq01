import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import { setUserHandle } from "@/lib/feed/set-user-handle";

export async function POST(request: Request) {
  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;

    const body = await request.json();
    const handle = typeof body.handle === "string" ? body.handle : "";

    const result = await setUserHandle(user.id, handle);
    if (!result.ok) {
      const status = result.error === "This handle is already taken." ? 409 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/feed/me/handle error", err);
    return NextResponse.json({ error: "Unable to save handle." }, { status: 500 });
  }
}
