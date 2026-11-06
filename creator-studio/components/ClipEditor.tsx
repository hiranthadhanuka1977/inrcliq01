"use client";

import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from "react";
import { mediaSrc } from "../lib/media";

type Kind = "video" | "audio";

const MIN_GAP = 0.4;

function clock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00.0";
  const total = Math.max(0, seconds);
  const minutes = Math.floor(total / 60);
  const remain = total - minutes * 60;
  return `${minutes}:${remain.toFixed(1).padStart(4, "0")}`;
}

function editorSrc(url: string) {
  if (url.startsWith("blob:")) return url;
  return `/api/media?src=${encodeURIComponent(url)}`;
}

async function uploadFile(kind: Kind | "image", file: File) {
  const body = new FormData();
  body.set("kind", kind);
  body.set("file", file);
  const response = await fetch("/api/upload", { method: "POST", body });
  const payload = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!response.ok || !payload?.url) throw new Error(payload?.error || "Upload failed.");
  return payload.url;
}

function seek(media: HTMLMediaElement, time: number) {
  const target = Number.isFinite(media.duration)
    ? Math.min(Math.max(0, time), Math.max(0, media.duration - 0.01))
    : Math.max(0, time);
  return new Promise<void>((resolve) => {
    if (Math.abs(media.currentTime - target) < 0.05 && Number.isFinite(media.duration)) {
      resolve();
      return;
    }
    const done = () => {
      media.removeEventListener("seeked", done);
      resolve();
    };
    media.addEventListener("seeked", done);
    media.currentTime = target;
  });
}

async function clipLength(media: HTMLMediaElement) {
  if (Number.isFinite(media.duration) && media.duration > 0) return media.duration;
  await seek(media, 1e10);
  const length = Number.isFinite(media.currentTime) ? media.currentTime : 0;
  if (length > 0) await seek(media, 0);
  return length;
}

export default function ClipEditor({
  kind,
  label,
  accept,
  initialMedia,
  initialThumb,
  initialTrimStartMs,
  initialTrimEndMs,
  initialDurationMs,
}: {
  kind: Kind;
  label: string;
  accept: string;
  initialMedia: string | null;
  initialThumb: string | null;
  initialTrimStartMs: number;
  initialTrimEndMs: number | null;
  initialDurationMs: number;
}) {
  const previewRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const sampleRef = useRef<HTMLVideoElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const localUrl = useRef<string | null>(null);
  const playingSelection = useRef(false);
  const framedSource = useRef("");
  const autoThumb = useRef(false);
  const [mediaUrl, setMediaUrl] = useState(initialMedia ?? "");
  const [previewUrl, setPreviewUrl] = useState(initialMedia ? editorSrc(initialMedia) : "");
  const [thumbUrl, setThumbUrl] = useState(initialThumb ?? "");
  const [duration, setDuration] = useState(initialDurationMs > 0 ? initialDurationMs / 1000 : 0);
  const [fileDurationMs, setFileDurationMs] = useState(initialDurationMs);
  const [start, setStart] = useState(initialTrimStartMs / 1000);
  const [end, setEnd] = useState<number | null>(initialTrimEndMs != null ? initialTrimEndMs / 1000 : null);
  const [playhead, setPlayhead] = useState(initialTrimStartMs / 1000);
  const [frames, setFrames] = useState<{ time: number; url: string }[]>([]);
  const [wave, setWave] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    return () => {
      if (localUrl.current) URL.revokeObjectURL(localUrl.current);
    };
  }, []);

  useEffect(() => {
    if (kind !== "audio" || !previewUrl) {
      setWave("");
      return;
    }
    let cancelled = false;
    let closed = false;
    const context = new AudioContext();
    const closeContext = () => {
      if (closed || context.state === "closed") return;
      closed = true;
      void context.close().catch(() => {});
    };
    void (async () => {
      try {
        const response = await fetch(previewUrl);
        const bytes = await response.arrayBuffer();
        if (cancelled || context.state === "closed") return;
        const decoded = await context.decodeAudioData(bytes.slice(0));
        if (cancelled) return;
        const channel = decoded.getChannelData(0);
        const bars = 96;
        const block = Math.max(1, Math.floor(channel.length / bars));
        const canvas = document.createElement("canvas");
        canvas.width = 960;
        canvas.height = 72;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#1558c0";
        for (let i = 0; i < bars; i += 1) {
          let peak = 0;
          for (let j = 0; j < block; j += 40) peak = Math.max(peak, Math.abs(channel[i * block + j] || 0));
          const height = Math.max(2, peak * canvas.height);
          const x = (i / bars) * canvas.width;
          ctx.fillRect(x, (canvas.height - height) / 2, canvas.width / bars - 2, height);
        }
        setWave(canvas.toDataURL("image/png"));
      } catch {
        if (!cancelled) setWave("");
      } finally {
        closeContext();
      }
    })();
    return () => {
      cancelled = true;
      closeContext();
    };
  }, [kind, previewUrl]);

  async function onLoaded(element: HTMLMediaElement) {
    const nextDuration = await clipLength(element);
    setDuration(nextDuration);
    if (nextDuration > 0) setFileDurationMs(Math.round(nextDuration * 1000));
    if (!nextDuration) return;
    setEnd((current) => (current == null ? nextDuration : Math.min(current, nextDuration)));
    setStart((current) => Math.min(Math.max(0, current), Math.max(0, nextDuration - MIN_GAP)));
    if (element.currentTime < start) element.currentTime = start;
  }

  function timeFromPointer(event: { clientX: number }) {
    const track = trackRef.current;
    if (!track || !duration) return 0;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    return ratio * duration;
  }

  function drag(mode: "start" | "end" | "seek", event: ReactPointerEvent) {
    if (!duration) return;
    event.preventDefault();
    event.stopPropagation();
    const apply = (point: { clientX: number }) => {
      const time = timeFromPointer(point);
      if (mode === "start") {
        setStart(Math.max(0, Math.min(time, (end ?? duration) - MIN_GAP)));
      } else if (mode === "end") {
        setEnd(Math.min(duration, Math.max(time, start + MIN_GAP)));
      } else {
        const preview = previewRef.current;
        if (preview) preview.currentTime = time;
        setPlayhead(time);
        playingSelection.current = false;
      }
    };
    apply(event);
    const move = (point: PointerEvent) => apply(point);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function onTime() {
    const preview = previewRef.current;
    if (!preview) return;
    setPlayhead(preview.currentTime);
    if (!playingSelection.current) return;
    const stop = end ?? preview.duration;
    if (Number.isFinite(stop) && preview.currentTime >= stop) {
      preview.pause();
      preview.currentTime = start;
      playingSelection.current = false;
    }
  }

  function playSelection() {
    const preview = previewRef.current;
    if (!preview) return;
    playingSelection.current = true;
    preview.currentTime = start;
    void preview.play();
  }

  async function readySample(source: string) {
    const sample = sampleRef.current;
    if (!sample) return null;
    if (sample.dataset.source !== source) {
      sample.dataset.source = source;
      sample.src = source;
    }
    if (sample.readyState < 1) {
      await new Promise<void>((resolve) => {
        if (sample.readyState >= 1) {
          resolve();
          return;
        }
        sample.addEventListener("loadedmetadata", () => resolve(), { once: true });
      });
    }
    return sample;
  }

  async function captureFrame(time: number, source = previewUrl) {
    if (kind !== "video" || !source) return;
    setBusy("Saving thumbnail…");
    setError("");
    try {
      const sample = await readySample(source);
      if (!sample) return;
      await seek(sample, time);
      const canvas = document.createElement("canvas");
      const width = sample.videoWidth || 1280;
      const height = sample.videoHeight || 720;
      const scale = Math.min(1, 1280 / width);
      canvas.width = Math.max(2, Math.round(width * scale));
      canvas.height = Math.max(2, Math.round(height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not read that frame.");
      ctx.drawImage(sample, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
      if (!blob) throw new Error("Could not read that frame.");
      const url = await uploadFile("image", new File([blob], "thumbnail.jpg", { type: "image/jpeg" }));
      setThumbUrl(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save that frame.");
    } finally {
      setBusy("");
    }
  }

  async function buildFrames(source: string) {
    if (kind !== "video" || framedSource.current === source) return;
    const sample = await readySample(source);
    if (!sample) return;
    const length = await clipLength(sample);
    if (!Number.isFinite(length) || length <= 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 90;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const next: { time: number; url: string }[] = [];
    const count = 8;
    for (let index = 0; index < count; index += 1) {
      const time = Math.min(length - 0.05, (length * (index + 0.5)) / count);
      await seek(sample, time);
      ctx.drawImage(sample, 0, 0, canvas.width, canvas.height);
      next.push({ time, url: canvas.toDataURL("image/jpeg", 0.7) });
    }
    framedSource.current = source;
    setFrames(next);
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy("Uploading…");
    setError("");
    setFrames([]);
    setStart(0);
    setEnd(null);
    setPlayhead(0);
    setDuration(0);
    setFileDurationMs(0);
    if (localUrl.current) URL.revokeObjectURL(localUrl.current);
    const objectUrl = URL.createObjectURL(file);
    localUrl.current = objectUrl;
    if (kind === "video") autoThumb.current = true;
    setPreviewUrl(objectUrl);
    try {
      const url = await uploadFile(kind, file);
      setMediaUrl(url);
    } catch (cause) {
      autoThumb.current = false;
      if (localUrl.current) URL.revokeObjectURL(localUrl.current);
      localUrl.current = null;
      setPreviewUrl(mediaUrl ? editorSrc(mediaUrl) : "");
      setError(cause instanceof Error ? cause.message : "Upload failed.");
    } finally {
      setBusy("");
    }
  }

  async function onCover(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(kind === "audio" ? "Uploading cover…" : "Uploading thumbnail…");
    setError("");
    try {
      setThumbUrl(await uploadFile("image", file));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed.");
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview || !previewUrl) return;
    let cancelled = false;
    const apply = () => {
      void clipLength(preview).then((length) => {
        if (cancelled || !length) return;
        setDuration(length);
        setFileDurationMs(Math.round(length * 1000));
        setEnd((current) => (current == null ? length : Math.min(current, length)));
        setStart((current) => Math.min(Math.max(0, current), Math.max(0, length - MIN_GAP)));
      });
    };
    if (preview.readyState >= 1) apply();
    else preview.addEventListener("loadedmetadata", apply, { once: true });
    return () => {
      cancelled = true;
      preview.removeEventListener("loadedmetadata", apply);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (kind !== "video" || !previewUrl) return;
    const source = previewUrl;
    void (async () => {
      try {
        await buildFrames(source);
        if (autoThumb.current) {
          autoThumb.current = false;
          await captureFrame(0.2, source);
        }
      } catch {
        setFrames([]);
      }
    })();
    // Reads the hidden video element. framedSource skips a clip that was already sampled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, previewUrl]);

  const shownEnd = end ?? duration;
  const endIsFull = end == null || (duration > 0 && shownEnd >= duration - 0.3);
  const startPct = duration ? (start / duration) * 100 : 0;
  const endPct = duration ? (shownEnd / duration) * 100 : 100;
  const playPct = duration ? (Math.min(playhead, duration) / duration) * 100 : 0;
  const hint = kind === "audio" ? "MP3, M4A, WAV, or AAC" : "MP4, MOV, or WebM";
  const coverLabel = kind === "audio" ? "Cover art" : "Thumbnail";

  return (
    <div className="studio-clip">
      <label className="studio-drop">
        <span className="studio-drop__label">{label}</span>
        <span className="studio-drop__zone">
          <input aria-label={label} type="file" accept={accept} onChange={(event) => void onFile(event)} />
          <strong>{busy === "Uploading…" ? "Uploading…" : mediaUrl ? "Replace file" : "Choose a file"}</strong>
          <span>{hint}</span>
        </span>
      </label>
      <input type="hidden" name="mediaUrl" value={mediaUrl} />
      <input type="hidden" name="thumbnailUrl" value={thumbUrl} />
      <input type="hidden" name="trimStartMs" value={String(Math.round(start * 1000))} />
      <input type="hidden" name="trimEndMs" value={endIsFull ? "" : String(Math.round(shownEnd * 1000))} />
      <input type="hidden" name="durationMs" value={String(fileDurationMs)} />

      {previewUrl ? (
        <div className="studio-clip__stage">
          {kind === "video" ? (
            <video
              ref={(node) => {
                previewRef.current = node;
              }}
              className="studio-preview"
              src={previewUrl}
              controls
              playsInline
              onLoadedMetadata={(event) => onLoaded(event.currentTarget)}
              onTimeUpdate={onTime}
            />
          ) : (
            <audio
              ref={(node) => {
                previewRef.current = node;
              }}
              className="studio-preview-audio"
              src={previewUrl}
              controls
              onLoadedMetadata={(event) => onLoaded(event.currentTarget)}
              onTimeUpdate={onTime}
            />
          )}
          {kind === "video" ? <video ref={sampleRef} className="studio-clip__sample" muted playsInline preload="auto" /> : null}

          <div className="studio-clip__toolbar">
            <button className="admin-btn admin-btn--subtle" type="button" onClick={playSelection} disabled={!duration}>
              Play selection
            </button>
            <button
              className="admin-btn admin-btn--subtle"
              type="button"
              disabled={!duration}
              onClick={() => setStart(Math.max(0, Math.min(playhead, shownEnd - MIN_GAP)))}
            >
              Set start here
            </button>
            <button
              className="admin-btn admin-btn--subtle"
              type="button"
              disabled={!duration}
              onClick={() => setEnd(Math.min(duration, Math.max(playhead, start + MIN_GAP)))}
            >
              Set end here
            </button>
            <button
              className="admin-btn admin-btn--subtle"
              type="button"
              disabled={!duration}
              onClick={() => {
                setStart(0);
                setEnd(duration);
                playingSelection.current = false;
              }}
            >
              Use full clip
            </button>
            <span className="studio-clip__readout">
              {clock(start)} – {clock(shownEnd)} · {clock(Math.max(0, shownEnd - start))} kept
            </span>
          </div>

          <div
            ref={trackRef}
            className="studio-clip__track"
            onPointerDown={(event) => drag("seek", event)}
            style={wave ? { backgroundImage: `url("${wave}")` } : undefined}
          >
            <div className="studio-clip__shade" style={{ width: `${startPct}%` }} />
            <div className="studio-clip__shade" style={{ left: `${endPct}%`, right: 0 }} />
            <div className="studio-clip__window" style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }} />
            <div className="studio-clip__playhead" style={{ left: `${playPct}%` }} />
            <button
              className="studio-clip__handle"
              type="button"
              aria-label="Trim start"
              style={{ left: `${startPct}%` }}
              onPointerDown={(event) => drag("start", event)}
            />
            <button
              className="studio-clip__handle"
              type="button"
              aria-label="Trim end"
              style={{ left: `${endPct}%` }}
              onPointerDown={(event) => drag("end", event)}
            />
          </div>
          <p className="studio-clip__hint">
            Drag the handles to trim. Drag the timeline to move the playhead. Playback on Videos uses this range.
          </p>

          <div className="studio-clip__cover">
            <div>
              <span className="studio-drop__label">{coverLabel}{kind === "audio" ? " · optional" : ""}</span>
              {thumbUrl ? <img src={mediaSrc(thumbUrl)} alt="" /> : <span className="studio-clip__empty">No {coverLabel.toLowerCase()} yet</span>}
            </div>
            <div className="studio-clip__cover-actions">
              {kind === "video" ? (
                <button className="admin-btn admin-btn--subtle" type="button" disabled={!duration || Boolean(busy)} onClick={() => void captureFrame(playhead)}>
                  Use this frame
                </button>
              ) : null}
              <label className="admin-btn admin-btn--subtle">
                Upload {coverLabel.toLowerCase()}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void onCover(event)} />
              </label>
            </div>
          </div>
          {kind === "video" && frames.length > 0 ? (
            <div className="studio-frames" aria-label="Thumbnail frames">
              {frames.map((frame) => (
                <button
                  key={frame.time}
                  type="button"
                  className="studio-frames__item"
                  onClick={() => {
                    const preview = previewRef.current;
                    if (preview) preview.currentTime = frame.time;
                    setPlayhead(frame.time);
                    void captureFrame(frame.time);
                  }}
                >
                  <img src={frame.url} alt="" />
                  <span>{clock(frame.time)}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {busy && busy !== "Uploading…" ? <small className="admin-meta">{busy}</small> : null}
      {error ? <small className="studio-error">{error}</small> : null}
    </div>
  );
}
