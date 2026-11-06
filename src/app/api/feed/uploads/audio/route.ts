import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import {
  AUDIO_MAX_BYTES,
  AUDIO_UPLOAD_FOLDER,
  audioExtensionFor,
  resolveAudioContentType,
} from "@/lib/uploads/audio-limits";
import { formatByteLimit } from "@/lib/uploads/video-limits";
import { storeUploadedFile } from "@/lib/uploads/store-upload";

export const maxDuration = 60;

export async function POST(request: Request) {
  const { error } = await requireSessionUser();
  if (error) return error;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const contentType = resolveAudioContentType(file.type, file.name);
    if (!contentType) {
      return NextResponse.json(
        { error: "Choose an audio clip (MP3, M4A, AAC, WAV, or OGG)." },
        { status: 400 },
      );
    }

    if (file.size <= 0 || file.size > AUDIO_MAX_BYTES) {
      return NextResponse.json(
        { error: `Audio clips must be ${formatByteLimit(AUDIO_MAX_BYTES)} or smaller.` },
        { status: 400 },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${randomBytes(6).toString("hex")}.${audioExtensionFor(contentType)}`;
    const stored = await storeUploadedFile({
      folder: AUDIO_UPLOAD_FOLDER,
      filename,
      bytes,
      contentType,
    });

    return NextResponse.json({ ok: true, kind: "audio", url: stored.url });
  } catch (error) {
    console.error("POST /api/feed/uploads/audio error", error);
    const message =
      error instanceof Error && error.message.includes("Blob store")
        ? error.message
        : "Unable to upload that audio clip.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
