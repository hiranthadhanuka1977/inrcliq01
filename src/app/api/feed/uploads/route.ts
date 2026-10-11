import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import { formatImageModerationError } from "@/lib/moderation/evaluate-predictions";
import {
  hashImageBytes,
  verifyModerationPassToken,
} from "@/lib/moderation/moderation-pass-token";
import { moderateImageBytes } from "@/lib/moderation/server-image-moderation";
import { storeUploadedFile } from "@/lib/uploads/store-upload";

export const maxDuration = 60;

const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extensionFor(type: string, filename: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  const fromName = filename.split(".").pop()?.toLowerCase();
  return fromName || "bin";
}

export async function POST(request: Request) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  try {
    const form = await request.formData();
    const file = form.get("file");
    const moderationPassToken =
      typeof form.get("moderationPassToken") === "string"
        ? String(form.get("moderationPassToken"))
        : "";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (file.type.startsWith("video/")) {
      // Videos can exceed the proxy body buffer, so they use /api/feed/uploads/video instead.
      return NextResponse.json(
        { error: "Videos are uploaded with the video uploader. Choose the video again." },
        { status: 400 },
      );
    }

    const isImage = IMAGE_TYPES.has(file.type) || file.type.startsWith("image/");
    if (!isImage) {
      return NextResponse.json(
        { error: "Choose a photo (JPG, PNG, WebP, GIF) or a video (MP4, MOV, WebM)." },
        { status: 400 },
      );
    }

    if (file.size <= 0 || file.size > IMAGE_MAX_BYTES) {
      return NextResponse.json({ error: "Image must be 8MB or smaller." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    const fileHash = hashImageBytes(bytes);
    const alreadyModerated = verifyModerationPassToken(user.id, fileHash, moderationPassToken);
    if (!alreadyModerated) {
      const moderation = await moderateImageBytes(bytes);
      if (!moderation.allowed) {
        return NextResponse.json(
          {
            error: formatImageModerationError(moderation),
            moderation: {
              title: moderation.title,
              message: moderation.message,
              category: moderation.category,
              confidence: moderation.confidence,
              verificationFailed: moderation.verificationFailed,
            },
          },
          { status: 422 },
        );
      }
    }

    const filename = `${Date.now()}-${randomBytes(6).toString("hex")}.${extensionFor(file.type, file.name)}`;
    const stored = await storeUploadedFile({
      folder: "uploads/feed-posts",
      filename,
      bytes,
      contentType: file.type,
    });

    return NextResponse.json({
      ok: true,
      kind: "image",
      url: stored.url,
    });
  } catch (error) {
    console.error("POST /api/feed/uploads error", error);
    const message =
      error instanceof Error && error.message.includes("Blob store")
        ? error.message
        : "Unable to upload that file.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
