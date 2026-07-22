import { NextResponse } from "next/server";
import {
  countActiveSubscribers,
  getSubscriptionForUser,
  normalizeNotifyLevel,
  resolveCreatorIdBySlug,
  subscribeToCreator,
  unsubscribeFromCreator,
  updateSubscriptionNotifyLevel,
} from "@/lib/feed/subscription-service";
import { getSessionUser } from "@/lib/session";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

function isMissingTableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("CreatorSubscription") ||
    message.includes("does not exist") ||
    message.includes("P2021") ||
    message.includes("P2022")
  );
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await context.params;
    const creator = await resolveCreatorIdBySlug(slug);
    if (!creator) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    const [subscription, subscriberCount] = await Promise.all([
      getSubscriptionForUser(user.id, creator.id),
      countActiveSubscribers(creator.id),
    ]);

    return NextResponse.json({
      slug: creator.slug,
      subscribed: subscription?.status === "ACTIVE",
      status: subscription?.status ?? "NONE",
      notifyLevel: subscription?.notifyLevel ?? "personalized",
      subscriberCount,
    });
  } catch (error) {
    console.error("GET /api/feed/subscriptions error", error);
    if (isMissingTableError(error)) {
      return NextResponse.json(
        { error: "Subscription table is missing. Run database migrations on this environment." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Unable to load subscription." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await context.params;
    const creator = await resolveCreatorIdBySlug(slug);
    if (!creator) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    const payload = (await request.json().catch(() => null)) as
      | { action?: string; notifyLevel?: string }
      | null;
    const action = payload?.action ?? "subscribe";

    if (action === "unsubscribe") {
      await unsubscribeFromCreator(user.id, creator.id);
    } else if (action === "notify") {
      const updated = await updateSubscriptionNotifyLevel(
        user.id,
        creator.id,
        normalizeNotifyLevel(payload?.notifyLevel),
      );
      if (!updated) {
        return NextResponse.json({ error: "Not subscribed" }, { status: 400 });
      }
    } else {
      await subscribeToCreator(user.id, creator.id, payload?.notifyLevel);
    }

    const [subscription, subscriberCount] = await Promise.all([
      getSubscriptionForUser(user.id, creator.id),
      countActiveSubscribers(creator.id),
    ]);

    return NextResponse.json({
      slug: creator.slug,
      subscribed: subscription?.status === "ACTIVE",
      status: subscription?.status ?? "NONE",
      notifyLevel: subscription?.notifyLevel ?? "personalized",
      subscriberCount,
    });
  } catch (error) {
    console.error("POST /api/feed/subscriptions error", error);
    if (isMissingTableError(error)) {
      return NextResponse.json(
        { error: "Subscription table is missing. Run database migrations on this environment." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Could not update subscription." }, { status: 500 });
  }
}
