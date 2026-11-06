import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getStudioContext } from "../../../lib/context";

export const runtime = "nodejs";

const MAX_BYTES = 40 * 1024 * 1024;

const KINDS: Record<string, { types: string[]; extensions: Record<string, string> }> = {
  video: {
    types: ["video/mp4", "video/quicktime", "video/webm"],
    extensions: { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" },
  },
  audio: {
    types: ["audio/mpeg", "audio/mp4", "audio/wav", "audio/aac", "audio/x-m4a", "audio/mp3"],
    extensions: {
      "audio/mpeg": "mp3",
      "audio/mp3": "mp3",
      "audio/mp4": "m4a",
      "audio/x-m4a": "m4a",
      "audio/wav": "wav",
      "audio/aac": "aac",
    },
  },
  image: {
    types: ["image/jpeg", "image/png", "image/webp"],
    extensions: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" },
  },
};

export async function POST(request: Request) {
  const ctx = await getStudioContext();
  if (ctx.kind !== "ok") {
    return NextResponse.json({ error: "Sign in from InrCliq to upload." }, { status: 401 });
  }

  const form = await request.formData();
  const kind = String(form.get("kind") ?? "");
  const spec = KINDS[kind];
  const file = form.get("file");
  if (!spec || !(file instanceof File)) {
    return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  }
  if (!spec.types.includes(file.type)) {
    return NextResponse.json({ error: "That file type is not supported." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Keep the file under 40 MB." }, { status: 400 });
  }

  const extension = spec.extensions[file.type];
  const filename = `${randomBytes(16).toString("hex")}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`uploads/studio/${filename}`, bytes, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
    });
    return NextResponse.json({ url: blob.url });
  }

  const folder = path.join(process.cwd(), "..", "public", "uploads", "studio");
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, filename), bytes);
  return NextResponse.json({ url: `/uploads/studio/${filename}` });
}
