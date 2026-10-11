import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import { VIDEO_CHUNK_BYTES } from "@/lib/uploads/video-limits";
import {
  abortChunkedVideoUpload,
  completeChunkedVideoUpload,
  startChunkedVideoUpload,
  videoUploadMode,
  writeVideoChunk,
} from "@/lib/uploads/video-upload";

function localOnly() {
  if (videoUploadMode() === "local") return null;
  return NextResponse.json(
    { error: "Chunked video uploads are only used with local file storage." },
    { status: 400 },
  );
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/** `{ action: "start", filename, contentType, size }` or `{ action: "complete", uploadId }`. */
export async function POST(request: Request) {
  const { user, error } = await requireSessionUser();
  if (error) return error;
  const blocked = localOnly();
  if (blocked) return blocked;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const result =
      body.action === "start"
        ? await startChunkedVideoUpload(user.id, {
            filename: asString(body.filename),
            contentType: asString(body.contentType),
            size: typeof body.size === "number" ? body.size : Number.NaN,
          })
        : body.action === "complete"
          ? await completeChunkedVideoUpload(user.id, asString(body.uploadId))
          : { ok: false as const, status: 400, error: "Unknown upload action." };

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/feed/uploads/video/chunks error", error);
    return NextResponse.json({ error: "Unable to upload that video." }, { status: 500 });
  }
}

/** Raw chunk bytes for `?uploadId=…&index=…`. */
export async function PUT(request: Request) {
  const { user, error } = await requireSessionUser();
  if (error) return error;
  const blocked = localOnly();
  if (blocked) return blocked;

  const params = new URL(request.url).searchParams;
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > VIDEO_CHUNK_BYTES) {
    return NextResponse.json({ error: "Chunk is too large." }, { status: 413 });
  }

  try {
    const bytes = new Uint8Array(await request.arrayBuffer());
    const result = await writeVideoChunk(
      user.id,
      params.get("uploadId") ?? "",
      Number(params.get("index")),
      bytes,
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /api/feed/uploads/video/chunks error", error);
    return NextResponse.json({ error: "Unable to save that part of the video." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  const uploadId = new URL(request.url).searchParams.get("uploadId") ?? "";
  await abortChunkedVideoUpload(user.id, uploadId).catch((cause) => {
    console.error("DELETE /api/feed/uploads/video/chunks error", cause);
  });
  return NextResponse.json({ ok: true });
}
