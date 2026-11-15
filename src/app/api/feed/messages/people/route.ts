import { NextResponse } from "next/server";
import { searchPeopleToMessage } from "@/lib/feed/message-people";
import { requireSessionUser } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** People the viewer can message: their follow network, plus anyone else matching the query. */
export async function GET(request: Request) {
  const { user, error } = await requireSessionUser();
  if (error || !user) return error;

  const query = new URL(request.url).searchParams.get("q") ?? "";

  try {
    const result = await searchPeopleToMessage(user.id, query);
    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/feed/messages/people error", err);
    return NextResponse.json({ error: "Unable to search people." }, { status: 500 });
  }
}
