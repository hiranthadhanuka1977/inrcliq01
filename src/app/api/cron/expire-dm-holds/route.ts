import { NextRequest, NextResponse } from "next/server";
import { expireOverdueHolds, purgeHeldBodies } from "@/lib/guardian/dm-moderation-hold";

export const maxDuration = 60;

/** Daily: expire undecided DM holds and purge held bodies past retention. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let expired = 0;
    for (let batch = 0; batch < 10; batch += 1) {
      const count = await expireOverdueHolds({ limit: 100 });
      expired += count;
      if (count < 100) break;
    }
    const purged = await purgeHeldBodies();
    return NextResponse.json({ ok: true, expired, ...purged });
  } catch (error) {
    console.error("GET /api/cron/expire-dm-holds error", error);
    return NextResponse.json({ error: "Cron run failed." }, { status: 500 });
  }
}
