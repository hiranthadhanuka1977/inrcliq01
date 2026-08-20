import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extensionFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "jpg";
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      return NextResponse.json({ error: "Image must be 8MB or smaller." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const filename = `${user.id}-${Date.now()}-${randomBytes(4).toString("hex")}.${extensionFor(file.type)}`;
    const relativeDir = join("uploads", "avatars");
    const absoluteDir = join(process.cwd(), "public", relativeDir);
    mkdirSync(absoluteDir, { recursive: true });
    writeFileSync(join(absoluteDir, filename), bytes);

    const avatarUrl = `/${relativeDir.replaceAll("\\", "/")}/${filename}`;
    const displayName =
      `${user.firstName?.trim() || ""} ${user.lastName?.trim() || ""}`.trim() ||
      user.email.split("@")[0] ||
      "Member";
    const handleBase =
      user.handle?.replace(/^@/, "").trim() ||
      displayName.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 24) ||
      `user${user.id.slice(-6)}`;
    const handle = handleBase.startsWith("@") ? handleBase : `@${handleBase}`;
    const initials = displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0] || "")
      .join("")
      .toUpperCase() || "ME";

    const existing = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    await prisma.$transaction([
      existing
        ? prisma.userProfile.update({
            where: { userId: user.id },
            data: { avatarUrl },
          })
        : prisma.userProfile.create({
            data: {
              userId: user.id,
              displayName,
              handle,
              avatarInitials: initials,
              avatarColor: "#6b9fff",
              avatarUrl,
            },
          }),
      prisma.creatorUser.updateMany({
        where: { userId: user.id },
        data: { avatarUrl },
      }),
    ]);

    return NextResponse.json({ ok: true, avatarUrl });
  } catch (error) {
    console.error("POST /api/feed/me/avatar error", error);
    return NextResponse.json({ error: "Unable to update profile photo." }, { status: 500 });
  }
}
