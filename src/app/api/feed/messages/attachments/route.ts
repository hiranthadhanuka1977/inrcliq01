import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import { formatImageModerationError } from "@/lib/moderation/evaluate-predictions";
import { moderateImageBytes } from "@/lib/moderation/server-image-moderation";
import { storeUploadedFile } from "@/lib/uploads/store-upload";

export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extensionFor(type: string, filename: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  if (type === "application/pdf") return "pdf";
  const fromName = filename.split(".").pop()?.toLowerCase();
  return fromName && /^[a-z0-9]{1,5}$/.test(fromName) ? fromName : "bin";
}

export async function POST(request: Request) {
  const { user, error } = await requireSessionUser();
  if (error || !user) return error;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a file to attach." }, { status: 400 });
    }

    const mime = file.type.trim().toLowerCase();
    const isImage = IMAGE_TYPES.has(mime);
    const isPdf = mime === "application/pdf";
    if (!isImage && !isPdf) {
      return NextResponse.json(
        { error: "Attach a photo (JPG, PNG, WebP, GIF) or a PDF." },
        { status: 400 },
      );
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Attachment must be 8MB or smaller." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (isImage) {
      const moderation = await moderateImageBytes(bytes);
      if (!moderation.allowed) {
        return NextResponse.json(
          { error: formatImageModerationError(moderation) },
          { status: 422 },
        );
      }
    }

    const filename = `${Date.now()}-${randomBytes(6).toString("hex")}.${extensionFor(mime, file.name)}`;
    const stored = await storeUploadedFile({
      folder: "uploads/messages",
      filename,
      bytes,
      contentType: mime,
    });

    return NextResponse.json({
      url: stored.url,
      name: file.name.trim() || "Attachment",
      mime,
      size: file.size,
    });
  } catch (uploadError) {
    console.error("POST /api/feed/messages/attachments error", uploadError);
    const message =
      uploadError instanceof Error && uploadError.message
        ? uploadError.message
        : "Could not attach that file.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
