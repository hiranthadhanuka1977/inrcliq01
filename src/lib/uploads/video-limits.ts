/** Web upload limits from the video uploading spec (US-BA-Specification/uc-video-uploading.md). */
export const VIDEO_MAX_BYTES = 10 * 1024 * 1024 * 1024;
export const VIDEO_MAX_DURATION_SECONDS = 240 * 60;

/** Local chunk size. Must stay under the proxy body buffer (10 MB) so chunks are never truncated. */
export const VIDEO_CHUNK_BYTES = 8 * 1024 * 1024;

export const VIDEO_UPLOAD_FOLDER = "uploads/feed-posts";

export const VIDEO_CONTENT_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;

const EXTENSION_BY_TYPE: Record<(typeof VIDEO_CONTENT_TYPES)[number], string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

const TYPE_BY_EXTENSION: Record<string, (typeof VIDEO_CONTENT_TYPES)[number]> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

export const VIDEO_PATHNAME_PATTERN = /^uploads\/feed-posts\/[a-z0-9-]+\.(mp4|mov|webm)$/;

export function formatByteLimit(bytes: number) {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

/** Resolves a supported video MIME type from the browser-reported type or the file extension. */
export function resolveVideoContentType(type: string, filename: string) {
  if ((VIDEO_CONTENT_TYPES as readonly string[]).includes(type)) {
    return type as (typeof VIDEO_CONTENT_TYPES)[number];
  }
  if (type && type !== "application/octet-stream" && !type.startsWith("video/")) return null;
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return TYPE_BY_EXTENSION[extension] ?? null;
}

export function videoExtensionFor(contentType: (typeof VIDEO_CONTENT_TYPES)[number]) {
  return EXTENSION_BY_TYPE[contentType];
}

export function looksLikeVideoFile(file: { type: string; name: string }) {
  if (file.type.startsWith("video/")) return true;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return extension in TYPE_BY_EXTENSION;
}
