import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { storeUploadedFile } from "@/lib/uploads/store-upload";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extensionFor(type: string) {
  switch (type) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
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

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Choose an image file (JPG, PNG, WebP, or GIF)." },
        { status: 400 },
      );
    }

    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be 5MB or smaller." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${randomBytes(6).toString("hex")}.${extensionFor(file.type)}`;
    const stored = await storeUploadedFile({
      folder: "uploads/seller-service-requests",
      filename,
      bytes,
      contentType: file.type,
    });

    return NextResponse.json({
      ok: true,
      url: stored.url,
    });
  } catch (error) {
    console.error("seller/uploads POST error", error);
    const message =
      error instanceof Error && error.message.includes("Blob store")
        ? error.message
        : "Unable to upload image.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
