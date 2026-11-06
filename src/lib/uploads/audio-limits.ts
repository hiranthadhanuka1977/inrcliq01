/** Keep audio clips under the proxy body buffer (10 MB) so the file is not truncated. */
export const AUDIO_MAX_BYTES = 8 * 1024 * 1024;

export const AUDIO_UPLOAD_FOLDER = "uploads/feed-posts";

export const AUDIO_CONTENT_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/ogg",
  "audio/webm",
] as const;

const EXTENSION_BY_TYPE: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
};

const TYPE_BY_EXTENSION: Record<string, (typeof AUDIO_CONTENT_TYPES)[number]> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  webm: "audio/webm",
};

export function resolveAudioContentType(type: string, filename: string) {
  const normalized = type.toLowerCase();
  if ((AUDIO_CONTENT_TYPES as readonly string[]).includes(normalized)) {
    return normalized as (typeof AUDIO_CONTENT_TYPES)[number];
  }
  if (normalized && normalized !== "application/octet-stream" && !normalized.startsWith("audio/")) return null;
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return TYPE_BY_EXTENSION[extension] ?? null;
}

export function audioExtensionFor(contentType: string) {
  return EXTENSION_BY_TYPE[contentType] ?? "mp3";
}

export function looksLikeAudioFile(file: { type: string; name: string }) {
  return resolveAudioContentType(file.type, file.name) !== null;
}
