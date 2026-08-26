import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import { storeUploadedFile } from "@/lib/uploads/store-upload";

const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const VIDEO_MAX_BYTES = 25 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

function extensionFor(type: string, filename: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  if (type === "video/webm") return "webm";
  if (type === "video/quicktime") return "mov";
  if (type === "video/mp4") return "mp4";
  const fromName = filename.split(".").pop()?.toLowerCase();
  return fromName || "bin";
}

export async function POST(request: Request) {
  const { error } = await requireSessionUser();
  if (error) return error;

  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const isImage = IMAGE_TYPES.has(file.type) || file.type.startsWith("image/");
    const isVideo = VIDEO_TYPES.has(file.type) || file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "Choose a photo (JPG, PNG, WebP, GIF) or a video (MP4, WebM)." },
        { status: 400 },
      );
    }

    const maxBytes = isVideo ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
    if (file.size <= 0 || file.size > maxBytes) {
      return NextResponse.json(
        { error: isVideo ? "Video must be 25MB or smaller." : "Image must be 8MB or smaller." },
        { status: 400 },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${randomBytes(6).toString("hex")}.${extensionFor(file.type, file.name)}`;
    const stored = await storeUploadedFile({
      folder: "uploads/feed-posts",
      filename,
      bytes,
      contentType: file.type,
    });

    return NextResponse.json({
      ok: true,
      kind: isVideo ? "video" : "image",
      url: stored.url,
    });
  } catch (error) {
    console.error("POST /api/feed/uploads error", error);
    const message =
      error instanceof Error && error.message.includes("BLOB_READ_WRITE_TOKEN")
        ? error.message
        : "Unable to upload that file.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
