import { NextResponse } from "next/server";
import { listUnavailableDateKeysBySlug } from "@/lib/seller/unavailable-dates";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const normalized = slug?.trim();
  if (!normalized) {
    return NextResponse.json({ error: "Invalid profile slug." }, { status: 400 });
  }

  try {
    const dates = await listUnavailableDateKeysBySlug(normalized);
    return NextResponse.json({ slug: normalized, dates });
  } catch (error) {
    console.error("feed/profile availability GET error", error);
    return NextResponse.json({ error: "Unable to load availability." }, { status: 500 });
  }
}
