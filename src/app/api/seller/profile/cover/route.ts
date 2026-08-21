import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { requireSellerCollectionIdentity } from "@/lib/seller/identity";

const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extensionFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "jpg";
}

async function persistCoverUrl(userId: string, coverUrl: string | null) {
  const existing = await prisma.userProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  const ops = [];
  if (existing) {
    ops.push(
      prisma.userProfile.update({
        where: { userId },
        data: { coverUrl },
      }),
    );
  }
  ops.push(
    prisma.creatorUser.updateMany({
      where: { userId },
      data: { coverUrl },
    }),
  );
  await prisma.$transaction(ops);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identity = await requireSellerCollectionIdentity();
  if (!identity || identity.userId !== user.id) {
    return NextResponse.json({ error: "Verified seller access required." }, { status: 403 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type) && !file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Choose an image file (JPG, PNG, WebP, or GIF)." },
        { status: 400 },
      );
    }

    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be 12MB or smaller." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const filename = `${user.id}-${Date.now()}-${randomBytes(4).toString("hex")}.${extensionFor(file.type)}`;
    const relativeDir = join("uploads", "covers");
    const absoluteDir = join(process.cwd(), "public", relativeDir);
    mkdirSync(absoluteDir, { recursive: true });
    writeFileSync(join(absoluteDir, filename), bytes);

    const coverUrl = `/${relativeDir.replaceAll("\\", "/")}/${filename}`;
    await persistCoverUrl(user.id, coverUrl);

    return NextResponse.json({ ok: true, coverUrl });
  } catch (error) {
    console.error("POST /api/seller/profile/cover error", error);
    return NextResponse.json({ error: "Unable to update profile banner." }, { status: 500 });
  }
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identity = await requireSellerCollectionIdentity();
  if (!identity || identity.userId !== user.id) {
    return NextResponse.json({ error: "Verified seller access required." }, { status: 403 });
  }

  try {
    await persistCoverUrl(user.id, null);
    return NextResponse.json({ ok: true, coverUrl: null });
  } catch (error) {
    console.error("DELETE /api/seller/profile/cover error", error);
    return NextResponse.json({ error: "Unable to remove profile banner." }, { status: 500 });
  }
}
