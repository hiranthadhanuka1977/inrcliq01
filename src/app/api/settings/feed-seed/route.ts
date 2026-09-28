import { NextResponse } from "next/server";
import {
  deleteFeedSeedSample,
  getFeedSeedStatus,
  restoreFeedSeedSample,
} from "@/lib/settings/feed-seed";

const DELETE_CONFIRMATION = "delete-seed-sample";

export async function GET() {
  try {
    return NextResponse.json(await getFeedSeedStatus());
  } catch (err) {
    console.error("settings/feed-seed GET error", err);
    return NextResponse.json({ error: "Unable to read the seed sample." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => null)) as { confirm?: string } | null;
  if (body?.confirm !== DELETE_CONFIRMATION) {
    return NextResponse.json({ error: "Deletion was not confirmed." }, { status: 400 });
  }

  try {
    const { deleted } = await deleteFeedSeedSample();
    return NextResponse.json({ deleted, status: await getFeedSeedStatus() });
  } catch (err) {
    console.error("settings/feed-seed DELETE error", err);
    return NextResponse.json({ error: "Unable to delete the seed sample." }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await restoreFeedSeedSample();
    return NextResponse.json({ ...result, status: await getFeedSeedStatus() });
  } catch (err) {
    console.error("settings/feed-seed POST error", err);
    return NextResponse.json({ error: "Unable to restore the seed sample." }, { status: 500 });
  }
}
