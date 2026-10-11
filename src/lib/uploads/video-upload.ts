import { randomBytes } from "node:crypto";
import { copyFile, mkdir, open, readdir, readFile, rename, rm, stat, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { usesBlobStorage } from "@/lib/uploads/store-upload";
import {
  formatByteLimit,
  resolveVideoContentType,
  VIDEO_CHUNK_BYTES,
  VIDEO_MAX_BYTES,
  VIDEO_UPLOAD_FOLDER,
  videoExtensionFor,
} from "@/lib/uploads/video-limits";

/**
 * - `blob-token`: browser uploads straight to Vercel Blob with a client token (BLOB_READ_WRITE_TOKEN).
 * - `blob-presigned`: browser uploads straight to Vercel Blob with a presigned URL (OIDC store binding).
 * - `local`: browser sends chunks to /api/feed/uploads/video/chunks, assembled under public/uploads.
 */
export type VideoUploadMode = "blob-token" | "blob-presigned" | "local" | "unavailable";

export function videoUploadMode(): VideoUploadMode {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob-token";
  if (usesBlobStorage()) return "blob-presigned";
  // Vercel functions have no persistent disk and cap request bodies at 4.5 MB.
  if (process.env.VERCEL) return "unavailable";
  return "local";
}

type Failure = { ok: false; status: number; error: string };

type ChunkSession = {
  userId: string;
  size: number;
  contentType: string;
  filename: string;
  chunkBytes: number;
  totalChunks: number;
  createdAt: number;
};

const SESSION_ROOT = join(tmpdir(), "inrcliq-video-uploads");
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const UPLOAD_ID_PATTERN = /^[a-f0-9]{32}$/;

const EXPIRED: Failure = {
  ok: false,
  status: 404,
  error: "This upload expired. Choose the video again.",
};

function sessionDir(uploadId: string) {
  return join(SESSION_ROOT, uploadId);
}

async function readSession(userId: string, uploadId: string): Promise<ChunkSession | null> {
  if (!UPLOAD_ID_PATTERN.test(uploadId)) return null;
  try {
    const session = JSON.parse(
      await readFile(join(sessionDir(uploadId), "session.json"), "utf8"),
    ) as ChunkSession;
    return session.userId === userId ? session : null;
  } catch {
    return null;
  }
}

async function pruneStaleSessions() {
  const entries = await readdir(SESSION_ROOT).catch(() => [] as string[]);
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const entry of entries) {
    if (!UPLOAD_ID_PATTERN.test(entry)) continue;
    const info = await stat(sessionDir(entry)).catch(() => null);
    if (info && info.mtimeMs < cutoff) {
      await rm(sessionDir(entry), { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

export function validateVideoUpload(input: { filename: string; contentType: string; size: number }) {
  const contentType = resolveVideoContentType(input.contentType, input.filename);
  if (!contentType) {
    return {
      ok: false as const,
      status: 415,
      error: "Unsupported file format. Choose an MP4, MOV, or WebM video.",
    };
  }
  if (!Number.isSafeInteger(input.size) || input.size <= 0) {
    return { ok: false as const, status: 400, error: "That video file is empty." };
  }
  if (input.size > VIDEO_MAX_BYTES) {
    return {
      ok: false as const,
      status: 413,
      error: `File exceeds ${formatByteLimit(VIDEO_MAX_BYTES)} limit.`,
    };
  }
  return { ok: true as const, contentType };
}

export async function startChunkedVideoUpload(
  userId: string,
  input: { filename: string; contentType: string; size: number },
) {
  const valid = validateVideoUpload(input);
  if (!valid.ok) return valid;

  await pruneStaleSessions();

  const uploadId = randomBytes(16).toString("hex");
  const session: ChunkSession = {
    userId,
    size: input.size,
    contentType: valid.contentType,
    filename: `${Date.now()}-${randomBytes(6).toString("hex")}.${videoExtensionFor(valid.contentType)}`,
    chunkBytes: VIDEO_CHUNK_BYTES,
    totalChunks: Math.ceil(input.size / VIDEO_CHUNK_BYTES),
    createdAt: Date.now(),
  };

  const dir = sessionDir(uploadId);
  await mkdir(join(dir, "received"), { recursive: true });
  await writeFile(join(dir, "data"), "");
  await writeFile(join(dir, "session.json"), JSON.stringify(session));

  return {
    ok: true as const,
    uploadId,
    chunkBytes: session.chunkBytes,
    totalChunks: session.totalChunks,
  };
}

/** Writes one chunk at its offset. Re-sending the same index (a retry) overwrites it in place. */
export async function writeVideoChunk(
  userId: string,
  uploadId: string,
  index: number,
  bytes: Uint8Array,
) {
  const session = await readSession(userId, uploadId);
  if (!session) return EXPIRED;

  if (!Number.isInteger(index) || index < 0 || index >= session.totalChunks) {
    return { ok: false as const, status: 400, error: "Invalid chunk index." };
  }
  const offset = index * session.chunkBytes;
  const expected = Math.min(session.chunkBytes, session.size - offset);
  if (bytes.byteLength !== expected) {
    return { ok: false as const, status: 400, error: "Chunk size mismatch." };
  }

  const dir = sessionDir(uploadId);
  const handle = await open(join(dir, "data"), "r+");
  try {
    await handle.write(bytes, 0, bytes.byteLength, offset);
  } finally {
    await handle.close();
  }
  await writeFile(join(dir, "received", String(index)), "");

  return { ok: true as const };
}

export async function completeChunkedVideoUpload(userId: string, uploadId: string) {
  const session = await readSession(userId, uploadId);
  if (!session) return EXPIRED;

  const dir = sessionDir(uploadId);
  const received = await readdir(join(dir, "received"));
  const { size } = await stat(join(dir, "data"));
  if (received.length !== session.totalChunks || size !== session.size) {
    return {
      ok: false as const,
      status: 409,
      error: "Some parts of the video are missing. Try uploading it again.",
    };
  }

  const targetDir = join(process.cwd(), "public", VIDEO_UPLOAD_FOLDER);
  const target = join(targetDir, session.filename);
  await mkdir(targetDir, { recursive: true });
  try {
    await rename(join(dir, "data"), target);
  } catch (error) {
    // The temp dir can sit on a different drive than the project.
    if ((error as NodeJS.ErrnoException).code !== "EXDEV") throw error;
    await copyFile(join(dir, "data"), target);
    await unlink(join(dir, "data"));
  }
  await rm(dir, { recursive: true, force: true });

  return { ok: true as const, url: `/${VIDEO_UPLOAD_FOLDER}/${session.filename}` };
}

export async function abortChunkedVideoUpload(userId: string, uploadId: string) {
  const session = await readSession(userId, uploadId);
  if (session) await rm(sessionDir(uploadId), { recursive: true, force: true });
}
