/**
 * Seed SpecialRequestCatalog for Mia Chen only (linked to her auth User).
 * Usage: npx tsx scripts/seed-special-requests-mia.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getCreatorRequests } from "../src/lib/feed/special-requests";
import { prisma } from "../src/lib/prisma";
import { SPECIAL_REQUESTS_OWNER_SLUG } from "../src/lib/seller/constants";

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

async function main() {
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
    throw new Error(
      `Mia Chen User not found for slug=${SPECIAL_REQUESTS_OWNER_SLUG}. Run db:link-creators first.`,
    );
  }

  const override = loadSellerJsonOverride();
  const builtin = getCreatorRequests(SPECIAL_REQUESTS_OWNER_SLUG);
  if (!override && !builtin) {
    throw new Error("No Mia Chen special requests catalog content found.");
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

  console.log(
    JSON.stringify(
      {
        catalogId: saved.id,
        userId: owner.userId,
        email: owner.user?.email,
        slug: SPECIAL_REQUESTS_OWNER_SLUG,
        enabled: saved.enabled,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
