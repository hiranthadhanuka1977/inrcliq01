import {
  formatByteLimit,
  resolveVideoContentType,
  VIDEO_MAX_BYTES,
  VIDEO_MAX_DURATION_SECONDS,
  VIDEO_UPLOAD_FOLDER,
  videoExtensionFor,
} from "@/lib/uploads/video-limits";

export type VideoValidationError = { title: string; message: string };

export type VideoUploadProgress = { loaded: number; total: number; retrying: boolean };

export type VideoDetails = {
  duration: number | null;
  width: number | null;
  height: number | null;
  poster: Blob | null;
};

const VIDEO_UPLOAD_URL = "/api/feed/uploads/video";
const CHUNK_UPLOAD_URL = "/api/feed/uploads/video/chunks";
const CHUNK_RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 15000];
/** Small files go up in one request; multipart parts on Blob must be at least 5 MB. */
const BLOB_MULTIPART_MIN_BYTES = 16 * 1024 * 1024;
const POSTER_MAX_WIDTH = 1280;
const INSPECT_TIMEOUT_MS = 15000;

export function validateVideoFile(file: File): VideoValidationError | null {
  if (!resolveVideoContentType(file.type, file.name)) {
    return { title: "Unsupported file format", message: "Choose an MP4, MOV, or WebM video." };
  }
  if (file.size <= 0) {
    return { title: "Unsupported file format", message: "That video file is empty." };
  }
  if (file.size > VIDEO_MAX_BYTES) {
    return {
      title: `File exceeds ${formatByteLimit(VIDEO_MAX_BYTES)} limit`,
      message: `This video is ${formatByteLimit(file.size)}. Choose a video up to ${formatByteLimit(VIDEO_MAX_BYTES)}.`,
    };
  }
  return null;
}

export function validateVideoDuration(duration: number | null): VideoValidationError | null {
  if (duration === null || duration <= VIDEO_MAX_DURATION_SECONDS) return null;
  return {
    title: `Video exceeds ${VIDEO_MAX_DURATION_SECONDS / 60} minute limit`,
    message: `This video is ${Math.ceil(duration / 60)} minutes long. Trim it and try again.`,
  };
}

function waitForEvent(target: HTMLVideoElement, event: string) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      target.removeEventListener(event, onEvent);
      target.removeEventListener("error", onError);
    };
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("The browser could not read this video."));
    };
    target.addEventListener(event, onEvent);
    target.addEventListener("error", onError);
  });
}

export async function seekVideo(video: HTMLVideoElement, time: number) {
  const seeked = waitForEvent(video, "seeked");
  video.currentTime = time;
  await seeked;
}

/** Where the automatic poster frame is taken: ~1s, or 10% into short clips. */
export function defaultPosterTime(duration: number | null) {
  return duration ? Math.min(1, duration * 0.1) : 0;
}

/** JPEG of the video's current frame, full frame, scaled to at most POSTER_MAX_WIDTH wide. */
export function captureVideoFrame(video: HTMLVideoElement): Promise<Blob | null> {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return Promise.resolve(null);
  const scale = Math.min(1, POSTER_MAX_WIDTH / width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
}

async function readVideoDetails(video: HTMLVideoElement, previewUrl: string): Promise<VideoDetails> {
  const loaded = waitForEvent(video, "loadeddata");
  video.src = previewUrl;
  await loaded;

  let duration = Number.isFinite(video.duration) ? video.duration : null;
  if (duration === null) {
    // Recorded WebM files often report an infinite duration until the end is reached.
    await seekVideo(video, Number.MAX_SAFE_INTEGER);
    duration = Number.isFinite(video.duration) ? video.duration : null;
  }

  const width = video.videoWidth || null;
  const height = video.videoHeight || null;
  if (!width || !height) return { duration, width, height, poster: null };

  await seekVideo(video, defaultPosterTime(duration));
  const poster = await captureVideoFrame(video);
  return { duration, width, height, poster };
}

/** Reads duration and dimensions from a hidden `<video>` and grabs a poster frame (~1s / 10% in). */
export async function inspectVideo(previewUrl: string): Promise<VideoDetails> {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  let timer = 0;
  const timeout = new Promise<VideoDetails>((resolve) => {
    timer = window.setTimeout(
      () => resolve({ duration: null, width: null, height: null, poster: null }),
      INSPECT_TIMEOUT_MS,
    );
  });

  const reading = readVideoDetails(video, previewUrl);
  reading.catch(() => undefined);
  try {
    return await Promise.race([reading, timeout]);
  } catch {
    return { duration: null, width: null, height: null, poster: null };
  } finally {
    window.clearTimeout(timer);
    video.removeAttribute("src");
    video.load();
  }
}

class UploadRequestError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

async function readError(response: Response, fallback: string) {
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  return data.error ?? fallback;
}

async function postJson<T>(url: string, body: unknown, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) throw new Error(await readError(response, "Unable to upload that video."));
  return (await response.json()) as T;
}

function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

async function sendChunk(url: string, chunk: Blob, signal: AbortSignal) {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body: chunk,
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new UploadRequestError("Network connection lost.", true);
  }
  if (!response.ok) {
    const message = await readError(response, "Unable to upload that video.");
    throw new UploadRequestError(message, response.status >= 500 || response.status === 408);
  }
}

async function uploadInChunks(
  file: File,
  contentType: string,
  signal: AbortSignal,
  onProgress: (progress: VideoUploadProgress) => void,
) {
  const { uploadId, chunkBytes, totalChunks } = await postJson<{
    uploadId: string;
    chunkBytes: number;
    totalChunks: number;
  }>(CHUNK_UPLOAD_URL, { action: "start", filename: file.name, contentType, size: file.size }, signal);

  try {
    for (let index = 0; index < totalChunks; index += 1) {
      const end = Math.min(file.size, (index + 1) * chunkBytes);
      const chunk = file.slice(index * chunkBytes, end);
      const url = `${CHUNK_UPLOAD_URL}?uploadId=${uploadId}&index=${index}`;

      for (let attempt = 0; ; attempt += 1) {
        try {
          await sendChunk(url, chunk, signal);
          break;
        } catch (error) {
          const retryable = error instanceof UploadRequestError && error.retryable;
          if (!retryable || attempt >= CHUNK_RETRY_DELAYS_MS.length) throw error;
          onProgress({ loaded: index * chunkBytes, total: file.size, retrying: true });
          await delay(CHUNK_RETRY_DELAYS_MS[attempt], signal);
        }
      }
      onProgress({ loaded: end, total: file.size, retrying: false });
    }

    const { url } = await postJson<{ url: string }>(
      CHUNK_UPLOAD_URL,
      { action: "complete", uploadId },
      signal,
    );
    return url;
  } catch (error) {
    void fetch(`${CHUNK_UPLOAD_URL}?uploadId=${uploadId}`, { method: "DELETE", keepalive: true }).catch(
      () => undefined,
    );
    throw error;
  }
}

/**
 * Uploads a video without passing the whole file through one request:
 * straight to Vercel Blob when a store is connected, otherwise in chunks to local disk.
 */
export async function uploadVideoFile(
  file: File,
  options: { signal: AbortSignal; onProgress: (progress: VideoUploadProgress) => void },
): Promise<string> {
  const { signal, onProgress } = options;
  const contentType = resolveVideoContentType(file.type, file.name);
  if (!contentType) throw new Error("Unsupported file format. Choose an MP4, MOV, or WebM video.");

  const modeResponse = await fetch(VIDEO_UPLOAD_URL, { signal });
  if (!modeResponse.ok) {
    throw new Error(await readError(modeResponse, "Unable to upload that video."));
  }
  const { mode } = (await modeResponse.json()) as { mode: string };

  if (mode === "blob-token" || mode === "blob-presigned") {
    const client = await import("@vercel/blob/client");
    const send = mode === "blob-token" ? client.upload : client.uploadPresigned;
    const suffix = Math.random().toString(36).slice(2, 10);
    const pathname = `${VIDEO_UPLOAD_FOLDER}/${Date.now()}-${suffix}.${videoExtensionFor(contentType)}`;
    const blob = await send(pathname, file, {
      access: "public",
      handleUploadUrl: VIDEO_UPLOAD_URL,
      contentType,
      multipart: file.size >= BLOB_MULTIPART_MIN_BYTES,
      abortSignal: signal,
      onUploadProgress: ({ loaded, total }) => onProgress({ loaded, total, retrying: false }),
    });
    return blob.url;
  }

  if (mode !== "local") {
    throw new Error("Video uploads need a connected Blob store. Link one to this project under Storage.");
  }
  return uploadInChunks(file, contentType, signal, onProgress);
}
