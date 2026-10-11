"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { formatClock, MIN_TRIM_SECONDS, normalizeMediaTrim } from "@/lib/feed/media-trim";
import { captureVideoFrame, defaultPosterTime, seekVideo } from "@/lib/uploads/video-upload-client";
import type { FeedMediaTrim } from "@/types/feed/feed";

type Tab = "trim" | "thumbnail";
type Edge = "start" | "end";
type Frame = { time: number; url: string };

/** What the editor last applied to a video, so reopening it starts from the same state. */
export type VideoEditState = {
  /** `null` plays the whole video. */
  trim: FeedMediaTrim | null;
  thumbnailTime: number | null;
};

export type VideoEditResult = VideoEditState & {
  /** New poster frame (full frame) when the thumbnail changed; `null` keeps the current poster. */
  poster: Blob | null;
};

const STRIP_FRAMES = 10;
const THUMB_FRAMES = 8;
const FRAME_HEIGHT = 72;
const KEY_STEP = 1;
const KEY_STEP_LARGE = 5;
/** Within this many seconds of either end, a trim counts as the whole video. */
const FULL_TOLERANCE = 0.05;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function snap(seconds: number) {
  return Math.round(seconds * 10) / 10;
}

/** Moves one edge of the range, keeping start < end with at least `minLength` between them. */
function withEdge(edge: Edge, time: number, start: number, end: number, duration: number, minLength: number) {
  return edge === "start"
    ? { start: clamp(time, 0, end - minLength), end }
    : { start, end: clamp(time, start + minLength, duration) };
}

function createSampler() {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  return video;
}

function releaseSampler(video: HTMLVideoElement) {
  video.removeAttribute("src");
  video.load();
}

/** Loads `src` into a hidden video and resolves with its duration (recorded WebM reports Infinity at first). */
async function loadSampler(video: HTMLVideoElement, src: string) {
  const loaded = new Promise<void>((resolve, reject) => {
    video.addEventListener("loadeddata", () => resolve(), { once: true });
    video.addEventListener("error", () => reject(new Error("load")), { once: true });
  });
  video.src = src;
  await loaded;
  if (!Number.isFinite(video.duration)) await seekVideo(video, Number.MAX_SAFE_INTEGER);
  return Number.isFinite(video.duration) ? video.duration : null;
}

async function drawFrames(
  video: HTMLVideoElement,
  times: number[],
  isCancelled: () => boolean,
  onFrame: (frame: Frame, index: number) => void,
) {
  const canvas = document.createElement("canvas");
  canvas.height = FRAME_HEIGHT;
  canvas.width = Math.round((FRAME_HEIGHT * video.videoWidth) / Math.max(1, video.videoHeight));
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  for (const [index, time] of times.entries()) {
    await seekVideo(video, time);
    if (isCancelled()) return false;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    onFrame({ time, url: canvas.toDataURL("image/jpeg", 0.7) }, index);
  }
  return true;
}

function evenlySpaced(from: number, to: number, count: number) {
  return Array.from({ length: count }, (_, index) => from + ((to - from) * (index + 0.5)) / count);
}

export default function ComposerVideoEditor({
  src,
  name,
  initial,
  onCancel,
  onDone,
}: {
  src: string;
  name: string;
  initial: VideoEditState | null;
  onCancel: () => void;
  onDone: (result: VideoEditResult) => void;
}) {
  const titleId = useId();
  const tabsId = useId();
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const trimTabRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<Edge | "playhead" | null>(null);
  const sampledThumbKeyRef = useRef("");

  const [tab, setTab] = useState<Tab>("trim");
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [stage, setStage] = useState({ w: 480, h: 270 });
  const [duration, setDuration] = useState<number | null>(null);
  /** `null` until the user moves a handle: the whole video plays. */
  const [range, setRange] = useState<FeedMediaTrim | null>(initial?.trim ?? null);
  const [playhead, setPlayhead] = useState(initial?.trim?.start ?? 0);
  const [playing, setPlaying] = useState(false);
  /** `null` until the user picks a frame: the poster stays as it is. */
  const [thumbnailTime, setThumbnailTime] = useState<number | null>(initial?.thumbnailTime ?? null);
  const [stripFrames, setStripFrames] = useState<Frame[]>([]);
  const [thumbFrames, setThumbFrames] = useState<{ key: string; frames: Frame[] }>({ key: "", frames: [] });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const total = duration ?? 0;
  const start = range && duration ? clamp(range.start, 0, duration) : 0;
  const end = range && duration ? clamp(range.end, start, duration) : total;
  const minLength = Math.min(MIN_TRIM_SECONDS, total);
  const isFull = start <= FULL_TOLERANCE && end >= total - FULL_TOLERANCE;
  const head = clamp(playhead, start, end);
  const currentThumb = thumbnailTime ?? defaultPosterTime(duration);
  const thumbOutside = currentThumb < start || currentThumb > end;
  const shownThumb = thumbOutside ? start : currentThumb;
  const rangeKey = `${start.toFixed(2)}-${end.toFixed(2)}`;
  const ready = Boolean(natural && duration);
  const previewTime = tab === "trim" ? head : shownThumb;

  useEffect(() => {
    trimTabRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  useEffect(() => {
    if (!natural) return;
    const size = natural;
    function fit() {
      const maxW = Math.min(720, window.innerWidth - 32);
      const maxH = Math.max(160, Math.min(420, window.innerHeight - 400));
      const scale = Math.min(maxW / size.w, maxH / size.h);
      setStage({ w: Math.max(1, Math.round(size.w * scale)), h: Math.max(1, Math.round(size.h * scale)) });
    }
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [natural]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !ready || playing) return;
    if (Math.abs(video.currentTime - previewTime) > 0.04) video.currentTime = previewTime;
  }, [ready, playing, previewTime]);

  // While previewing, stop at the end of the range.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playing) return;
    let frame = 0;
    const tick = () => {
      if (video.currentTime >= end) {
        video.pause();
        video.currentTime = end;
        setPlayhead(end);
        return;
      }
      setPlayhead(video.currentTime);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, end]);

  // Filmstrip across the whole video, sampled from a hidden video so seeking does not fight the preview.
  useEffect(() => {
    let cancelled = false;
    const sampler = createSampler();
    async function sample() {
      const length = await loadSampler(sampler, src);
      if (cancelled || !length) return;
      setDuration(length);
      await drawFrames(sampler, evenlySpaced(0, length, STRIP_FRAMES), () => cancelled, (frame) =>
        setStripFrames((current) => [...current, frame]),
      );
    }
    sample().catch(() => undefined);
    return () => {
      cancelled = true;
      releaseSampler(sampler);
    };
  }, [src]);

  // Thumbnail choices come only from the trimmed range.
  useEffect(() => {
    if (tab !== "thumbnail" || !duration || sampledThumbKeyRef.current === rangeKey) return;
    let cancelled = false;
    const key = rangeKey;
    const sampler = createSampler();
    async function sample() {
      await loadSampler(sampler, src);
      if (cancelled) return;
      const finished = await drawFrames(sampler, evenlySpaced(start, end, THUMB_FRAMES), () => cancelled, (frame, index) =>
        setThumbFrames((current) =>
          index === 0 || current.key !== key ? { key, frames: [frame] } : { key, frames: [...current.frames, frame] },
        ),
      );
      if (finished && !cancelled) sampledThumbKeyRef.current = key;
    }
    sample().catch(() => undefined);
    return () => {
      cancelled = true;
      releaseSampler(sampler);
    };
  }, [tab, duration, src, start, end, rangeKey]);

  useEffect(() => {
    if (!duration) return;
    const length = duration;
    function timeAt(clientX: number) {
      const box = trackRef.current?.getBoundingClientRect();
      if (!box || !box.width) return 0;
      return snap(clamp((clientX - box.left) / box.width, 0, 1) * length);
    }
    function onMove(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const time = timeAt(event.clientX);
      if (drag === "playhead") {
        setPlayhead(clamp(time, start, end));
        return;
      }
      const next = withEdge(drag, time, start, end, length, minLength);
      setRange(next);
      setPlayhead(drag === "start" ? next.start : next.end);
    }
    function onUp() {
      dragRef.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [duration, start, end, minLength]);

  function handleLoadedMetadata() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    if (Number.isFinite(video.duration)) setDuration(video.duration);
    setNatural({ w: video.videoWidth, h: video.videoHeight });
  }

  function applyEdge(edge: Edge, time: number) {
    if (!duration) return;
    videoRef.current?.pause();
    const next = withEdge(edge, snap(time), start, end, duration, minLength);
    setRange(next);
    setPlayhead(edge === "start" ? next.start : next.end);
  }

  function onHandlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!ready) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus();
    videoRef.current?.pause();
    dragRef.current = event.currentTarget.dataset.edge as Edge;
  }

  function onHandleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const edge = event.currentTarget.dataset.edge as Edge;
    const value = edge === "start" ? start : end;
    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    let next: number;
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowDown":
        next = value - step;
        break;
      case "ArrowRight":
      case "ArrowUp":
        next = value + step;
        break;
      case "PageDown":
        next = value - KEY_STEP_LARGE;
        break;
      case "PageUp":
        next = value + KEY_STEP_LARGE;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = total;
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    applyEdge(edge, next);
  }

  function onTrackPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const box = trackRef.current?.getBoundingClientRect();
    if (!ready || !box || !box.width) return;
    event.preventDefault();
    videoRef.current?.pause();
    setPlayhead(clamp(snap(((event.clientX - box.left) / box.width) * total), start, end));
    dragRef.current = "playhead";
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video || !ready) return;
    if (!video.paused) {
      video.pause();
      return;
    }
    if (video.currentTime < start || video.currentTime >= end - 0.05) {
      video.currentTime = start;
      setPlayhead(start);
    }
    void video.play().catch(() => undefined);
  }

  function resetTrim() {
    videoRef.current?.pause();
    setRange(null);
    setPlayhead(0);
  }

  function selectTab(next: Tab) {
    videoRef.current?.pause();
    setTab(next);
  }

  function onTabKeyDown(event: ReactKeyboardEvent) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next: Tab = tab === "trim" ? "thumbnail" : "trim";
    selectTab(next);
    document.getElementById(`${tabsId}-${next}`)?.focus();
  }

  async function done() {
    const video = videoRef.current;
    if (!video || !ready) return;
    setSaving(true);
    setError("");
    video.pause();
    try {
      const trim = isFull ? null : (normalizeMediaTrim({ start, end }) ?? null);
      const picked = thumbnailTime !== null && thumbnailTime !== (initial?.thumbnailTime ?? null);
      const posterChanged = thumbOutside || picked;
      let poster: Blob | null = null;
      if (posterChanged) {
        if (Math.abs(video.currentTime - shownThumb) > 0.04) await seekVideo(video, shownThumb);
        poster = await captureVideoFrame(video);
        if (!poster) throw new Error("Could not capture that frame.");
      }
      onDone({
        trim,
        thumbnailTime: posterChanged ? shownThumb : (initial?.thumbnailTime ?? null),
        poster,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your changes.");
      setSaving(false);
    }
  }

  const percent = (seconds: number) => (total ? `${(seconds / total) * 100}%` : "0%");
  const shownThumbFrames = thumbFrames.key === rangeKey ? thumbFrames.frames : [];
  const activeFrameIndex =
    thumbnailTime === null || !shownThumbFrames.length
      ? -1
      : shownThumbFrames.reduce(
          (best, frame, index) =>
            Math.abs(frame.time - shownThumb) < Math.abs(shownThumbFrames[best].time - shownThumb) ? index : best,
          0,
        );

  return createPortal(
    <div className="image-editor video-editor" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="image-editor__bar">
        <button type="button" className="btn btn--secondary btn--sm" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <h2 id={titleId}>Edit video</h2>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => void done()}
          disabled={!ready || saving}
        >
          {saving ? "Saving…" : "Done"}
        </button>
      </div>

      <div className="video-editor__tabs" role="tablist" aria-label="Video editing tools">
        {(["trim", "thumbnail"] as const).map((id) => (
          <button
            key={id}
            ref={id === "trim" ? trimTabRef : undefined}
            id={`${tabsId}-${id}`}
            type="button"
            role="tab"
            className={`video-editor__tab${tab === id ? " is-active" : ""}`}
            aria-selected={tab === id}
            aria-controls={`${tabsId}-panel`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => selectTab(id)}
            onKeyDown={onTabKeyDown}
          >
            {id === "trim" ? "Trim" : "Thumbnail"}
          </button>
        ))}
      </div>

      <div className="image-editor__workspace">
        {!ready && !error ? <p className="image-editor__status">Loading video…</p> : null}
        <div
          className="image-editor__stage video-editor__stage"
          style={{ width: stage.w, height: stage.h, visibility: ready ? "visible" : "hidden" }}
        >
          <video
            ref={videoRef}
            className="video-editor__video"
            src={src}
            playsInline
            preload="auto"
            aria-label={name}
            onClick={tab === "trim" ? togglePlay : undefined}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={() => setError("Could not load this video for editing.")}
          />
        </div>
      </div>

      <div
        id={`${tabsId}-panel`}
        className="image-editor__tools video-editor__tools"
        role="tabpanel"
        aria-labelledby={`${tabsId}-${tab}`}
      >
        {error ? (
          <p className="image-editor__status image-editor__status--error video-editor__error" role="alert">
            {error}
          </p>
        ) : null}
        {tab === "trim" ? (
          <div className="video-trim">
            <div ref={trackRef} className="video-trim__track" onPointerDown={onTrackPointerDown}>
              <div className="video-trim__frames" aria-hidden="true">
                {Array.from({ length: STRIP_FRAMES }, (_, index) =>
                  stripFrames[index] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={index} src={stripFrames[index].url} alt="" draggable={false} />
                  ) : (
                    <span key={index} className="is-loading" />
                  ),
                )}
              </div>
              <span className="video-trim__shade video-trim__shade--start" style={{ width: percent(start) }} />
              <span className="video-trim__shade video-trim__shade--end" style={{ width: percent(total - end) }} />
              <span
                className="video-trim__window"
                style={{ left: percent(start), width: percent(end - start) }}
                aria-hidden="true"
              />
              <span className="video-trim__playhead" style={{ left: percent(head) }} aria-hidden="true" />
              <div
                className="video-trim__handle video-trim__handle--start"
                style={{ left: percent(start) }}
                role="slider"
                tabIndex={ready ? 0 : -1}
                data-edge="start"
                aria-label="Trim start"
                aria-orientation="horizontal"
                aria-valuemin={0}
                aria-valuemax={snap(Math.max(0, end - minLength))}
                aria-valuenow={snap(start)}
                aria-valuetext={formatClock(start)}
                aria-disabled={!ready}
                onPointerDown={onHandlePointerDown}
                onKeyDown={onHandleKeyDown}
              />
              <div
                className="video-trim__handle video-trim__handle--end"
                style={{ left: percent(end) }}
                role="slider"
                tabIndex={ready ? 0 : -1}
                data-edge="end"
                aria-label="Trim end"
                aria-orientation="horizontal"
                aria-valuemin={snap(start + minLength)}
                aria-valuemax={snap(total)}
                aria-valuenow={snap(end)}
                aria-valuetext={formatClock(end)}
                aria-disabled={!ready}
                onPointerDown={onHandlePointerDown}
                onKeyDown={onHandleKeyDown}
              />
            </div>
            <div className="video-trim__bar">
              <button
                type="button"
                className="video-trim__play"
                onClick={togglePlay}
                disabled={!ready}
                aria-label={playing ? "Pause preview" : "Play trimmed part"}
              >
                {playing ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M7 5h4v14H7zM13 5h4v14h-4z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <p className="video-trim__readouts" aria-live="polite">
                <span>
                  Start <strong>{formatClock(start)}</strong>
                </span>
                <span>
                  End <strong>{formatClock(end)}</strong>
                </span>
                <span>
                  Length <strong>{formatClock(end - start)}</strong>
                </span>
              </p>
              <button
                type="button"
                className="image-editor__chip video-trim__reset"
                onClick={resetTrim}
                disabled={!ready || isFull}
              >
                Reset
              </button>
            </div>
            <p className="video-editor__hint">
              Drag the handles to choose the part that plays. Use the arrow keys on a handle for 1-second steps, or
              Shift for 5.
            </p>
          </div>
        ) : (
          <div className="video-editor__thumbs">
            <div className="video-editor__filmstrip" role="group" aria-label="Frames">
              {shownThumbFrames.length
                ? shownThumbFrames.map((frame, index) => (
                    <button
                      key={frame.time}
                      type="button"
                      className={`video-editor__frame${index === activeFrameIndex ? " is-active" : ""}`}
                      aria-label={`Use the frame at ${formatClock(frame.time)}`}
                      aria-pressed={index === activeFrameIndex}
                      onClick={() => setThumbnailTime(frame.time)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={frame.url} alt="" />
                    </button>
                  ))
                : Array.from({ length: THUMB_FRAMES }, (_, index) => (
                    <span key={index} className="video-editor__frame is-loading" aria-hidden="true" />
                  ))}
            </div>
            <label className="video-editor__scrub">
              <span className="sr-only">Thumbnail time</span>
              <input
                type="range"
                min={start}
                max={end}
                step={0.05}
                value={shownThumb}
                disabled={!ready}
                onChange={(event) => setThumbnailTime(Number(event.target.value))}
                aria-valuetext={formatClock(shownThumb)}
              />
              <span className="video-editor__time" aria-hidden="true">
                {formatClock(shownThumb)} / {formatClock(end)}
              </span>
            </label>
            <p className="video-editor__hint">Thumbnails come from the trimmed part of the video.</p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
