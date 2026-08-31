import { createHash, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { getCreatorRequests } from "@/lib/feed/special-requests";
import { prisma } from "@/lib/prisma";
import { SPECIAL_REQUESTS_OWNER_SLUG } from "@/lib/seller/constants";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYNC_TOKEN = process.env.FULL_SYNC_SECRET?.trim() || "";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function authorize(request: Request): boolean {
  const header = request.headers.get("x-full-sync-secret") || "";
  if (!header || !SYNC_TOKEN) return false;
  const a = createHash("sha256").update(header).digest();
  const b = createHash("sha256").update(SYNC_TOKEN).digest();
  return a.length === b.length && timingSafeEqual(a, b);
}

function loadSellerJsonOverride() {
  const path = join(process.cwd(), "data", "seller-service-requests", "mia-chen.json");
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as {
      enabled?: boolean;
      content?: unknown;
    };
    if (!parsed?.content || typeof parsed.content !== "object") return null;
    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : true,
      content: parsed.content,
      source: "seller-json",
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!authorize(request)) return unauthorized();

  try {
    const owner = await prisma.creatorUser.findFirst({
      where: { slug: SPECIAL_REQUESTS_OWNER_SLUG },
      select: {
        id: true,
        userId: true,
        name: true,
        user: { select: { id: true, email: true } },
      },
    });

    if (!owner?.userId) {
      return NextResponse.json(
        {
          error: `Mia Chen user not found for slug=${SPECIAL_REQUESTS_OWNER_SLUG}. Run db:link-creators on production first.`,
        },
        { status: 404 },
      );
    }

    const override = loadSellerJsonOverride();
    const builtin = getCreatorRequests(SPECIAL_REQUESTS_OWNER_SLUG);
    if (!override && !builtin) {
      return NextResponse.json({ error: "No Mia Chen special requests catalog content found." }, { status: 500 });
    }

    const enabled = override?.enabled ?? true;
    const content = override?.content ?? builtin;
    const source = override?.source ?? "builtin";

    const saved = await prisma.specialRequestCatalog.upsert({
      where: { userId: owner.userId },
      create: {
        userId: owner.userId,
        enabled,
        content: content as object,
        source,
      },
      update: {
        enabled,
        content: content as object,
        source,
      },
      select: { id: true, enabled: true, updatedAt: true },
    });

    await prisma.userProfile.updateMany({
      where: { userId: owner.userId },
      data: { specialRequests: enabled },
    });

    const categories =
      content && typeof content === "object" && "categories" in content && Array.isArray(content.categories)
        ? content.categories.length
        : 0;

    return NextResponse.json({
      ok: true,
      catalogId: saved.id,
      userId: owner.userId,
      email: owner.user?.email ?? null,
      slug: SPECIAL_REQUESTS_OWNER_SLUG,
      enabled: saved.enabled,
      categories,
      updatedAt: saved.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("seed-special-requests error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Seed failed" },
      { status: 500 },
    );
  }
}
