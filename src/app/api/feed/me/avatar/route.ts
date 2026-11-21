import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { storeUploadedFile } from "@/lib/uploads/store-upload";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

async function uniqueProfileHandle(base: string) {
  const root = base.replace(/^@/, "").replace(/[^a-z0-9._-]/g, "").slice(0, 20) || "member";
  for (let suffix = 0; suffix < 50; suffix += 1) {
    const extra = suffix === 0 ? "" : String(suffix);
    const handle = `@${root.slice(0, 24 - extra.length)}${extra}`;
    const taken = await prisma.userProfile.findFirst({
      where: { handle: { equals: handle, mode: "insensitive" } },
      select: { id: true },
    });
    if (!taken) return handle;
  }
  return `@member${randomBytes(3).toString("hex")}`;
}

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
    const stored = await storeUploadedFile({
      folder: "uploads/avatars",
      filename,
      bytes,
      contentType: file.type,
    });
    const avatarUrl = stored.url;
    const existing = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    const displayName =
      `${user.firstName?.trim() || ""} ${user.lastName?.trim() || ""}`.trim() ||
      user.email.split("@")[0] ||
      "Member";
    const handleBase =
      user.handle?.replace(/^@/, "").trim() ||
      displayName.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 20) ||
      `user${user.id.slice(-6)}`;
    const initials = displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0] || "")
      .join("")
      .toUpperCase() || "ME";

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
              handle: await uniqueProfileHandle(handleBase),
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
