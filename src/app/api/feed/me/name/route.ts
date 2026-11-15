import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import { setUserName } from "@/lib/feed/set-user-name";

export async function POST(request: Request) {
  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;

    const body = await request.json();
    const firstName = typeof body.firstName === "string" ? body.firstName : "";
    const lastName = typeof body.lastName === "string" ? body.lastName : "";
    const result = await setUserName(user.id, firstName, lastName);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/feed/me/name error", err);
    return NextResponse.json({ error: "Unable to save your name." }, { status: 500 });
  }
}
