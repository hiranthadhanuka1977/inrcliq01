import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import { searchComposerGifs } from "@/data/feed/composer-gifs";

export async function GET(request: Request) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  return NextResponse.json({ results: searchComposerGifs(query) });
}
