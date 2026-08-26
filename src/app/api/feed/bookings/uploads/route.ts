import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { storeUploadedFile } from "@/lib/uploads/store-upload";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

function extensionFor(type: string, filename: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  if (type === "application/pdf") return "pdf";
  if (type === "application/msword") return "doc";
  if (type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return "docx";
  }
  if (type === "text/plain") return "txt";
  const fromName = filename.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,8}$/.test(fromName)) return fromName;
  return "bin";
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
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const allowedByType = ALLOWED_TYPES.has(file.type);
    const allowedByName = /\.(pdf|docx?|txt|jpe?g|png|webp|gif)$/i.test(file.name);
    if (!allowedByType && !allowedByName) {
      return NextResponse.json(
        { error: "Choose a PDF, Word, text, or image file." },
        { status: 400 },
      );
    }

    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File must be 10MB or smaller." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${randomBytes(6).toString("hex")}.${extensionFor(file.type, file.name)}`;
    const stored = await storeUploadedFile({
      folder: "uploads/booking-accept",
      filename,
      bytes,
      contentType: file.type,
    });

    return NextResponse.json({
      ok: true,
      url: stored.url,
      name: file.name,
    });
  } catch (error) {
    console.error("POST /api/feed/bookings/uploads error", error);
    const message =
      error instanceof Error && error.message.includes("BLOB_READ_WRITE_TOKEN")
        ? error.message
        : "Unable to upload that file.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
