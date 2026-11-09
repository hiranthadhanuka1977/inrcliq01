"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import VideoDurationBadge from "@/components/feed/VideoDurationBadge";
import VideoThumbMenu, { VideoShelfToast, visibleShelfItems } from "@/components/feed/VideoThumbMenu";
import { watchClipDuration, watchClipFrame } from "@/lib/feed/video-clip-cache";
import type { VideoShelfItem } from "@/lib/feed/video-shelf";
import { claimShelfMenu, isShelfItemHidden, releaseShelfMenu, subscribeShelfMenu, useShelfPrefs } from "@/lib/feed/video-shelf-menu";

/** Only one card previews at a time. Moving to another card stops the previous one. */
let activePreview: { stop: () => void } | null = null;
const PREVIEW_DELAY_MS = 280;

function formatProbeDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const safe = Math.round(seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remain = safe % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(remain).padStart(2, "0")}`;
  return `${minutes}:${String(remain).padStart(2, "0")}`;
}

function previewSource(item: VideoShelfItem) {
  return item.playback?.src ?? item.previewUrl;
}

export default function VideoShelfCard({
  item,
  layout = "grid",
}: {
  item: VideoShelfItem;
  layout?: "grid" | "row";
}) {
  const thumbRef = useRef<HTMLSpanElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoverTimer = useRef(0);
  const previewControl = useRef({ stop: () => {} });
  const [previewing, setPreviewing] = useState(false);
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [probedLabel, setProbedLabel] = useState<string | null>(null);
  const [menuPoint, setMenuPoint] = useState<{ x: number; y: number } | null>(null);
  const src = previewSource(item);
  const start = item.playback ? Math.max(0, item.playback.startMs / 1000) : 0;
  const end = item.playback?.endMs != null ? item.playback.endMs / 1000 : null;

  const stopPreview = useCallback(() => {
    window.clearTimeout(hoverTimer.current);
    if (activePreview === previewControl.current) activePreview = null;
    setPreviewing(false);
  }, []);

  previewControl.current.stop = stopPreview;

  const play = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.pointerType === "touch" || !src) return;
    window.clearTimeout(hoverTimer.current);
    if (activePreview && activePreview !== previewControl.current) activePreview.stop();
    activePreview = previewControl.current;
    hoverTimer.current = window.setTimeout(() => {
      if (activePreview !== previewControl.current) return;
      setPreviewing(true);
    }, PREVIEW_DELAY_MS);
  };

  useEffect(() => stopPreview, [stopPreview]);

  useEffect(() => {
    const thumb = thumbRef.current;
    const needsFrame = !item.thumbnailUrl;
    const needsDuration = !item.durationLabel;
    if (!thumb || !src || (!needsFrame && !needsDuration)) return;
    let unsubscribe = () => {};
    const observer = new IntersectionObserver(([entry]) => {
      unsubscribe();
      unsubscribe = () => {};
      if (!entry?.isIntersecting) return;
      const stops: Array<() => void> = [];
      if (needsFrame) stops.push(watchClipFrame(src, Math.max(item.previewSeconds, 0.1), setFrameUrl));
      if (needsDuration) {
        stops.push(watchClipDuration(src, (seconds) => {
          if (seconds == null) return;
          const stop = end != null ? Math.min(end, seconds) : seconds;
          const label = formatProbeDuration(stop - start);
          if (label) setProbedLabel(label);
        }));
      }
      unsubscribe = () => stops.forEach((stop) => stop());
    }, { rootMargin: "240px" });
    observer.observe(thumb);
    return () => {
      observer.disconnect();
      unsubscribe();
    };
  }, [end, item.durationLabel, item.previewSeconds, item.thumbnailUrl, src, start]);

  useEffect(() => {
    const video = videoRef.current;
    if (!previewing || !video) return;
    video.muted = true;
    const startPlayback = () => {
      if (video.currentTime < start || (end != null && video.currentTime >= end - 0.05)) {
        video.currentTime = start;
      }
      void video.play().catch(() => setPreviewing(false));
    };
    if (video.readyState >= 2) startPlayback();
    else video.addEventListener("loadeddata", startPlayback, { once: true });
    return () => {
      video.removeEventListener("loadeddata", startPlayback);
      video.pause();
    };
  }, [end, previewing, start]);

  const closeMenu = useCallback(() => {
    setMenuPoint(null);
    releaseShelfMenu(item.key);
  }, [item.key]);

  const openMenu = (x: number, y: number) => {
    stopPreview();
    claimShelfMenu(item.key);
    setMenuPoint({ x, y });
  };

  useEffect(() => subscribeShelfMenu((key) => {
    if (key !== item.key) setMenuPoint(null);
  }), [item.key]);

  return (
    <div
      className={`yt-card${layout === "row" ? " yt-card--row" : ""}${menuPoint ? " is-menu-open" : ""}`}
      onContextMenu={(event) => {
        event.preventDefault();
        openMenu(event.clientX, event.clientY);
      }}
    >
      <span
        ref={thumbRef}
        className={`yt-card__thumb${previewing ? " is-previewing" : ""}`}
        onPointerEnter={play}
        onPointerLeave={stopPreview}
      >
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumbnailUrl} alt="" />
        ) : frameUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="yt-card__still" src={frameUrl} alt="" />
        ) : (
          <span className="yt-card__fallback" />
        )}
        {previewing && src ? (
          <video
            ref={videoRef}
            className="yt-card__preview"
            src={src}
            muted
            playsInline
            preload="auto"
            loop={end == null && start === 0}
            aria-hidden="true"
            tabIndex={-1}
            onEnded={(event) => {
              if (start === 0 && end == null) return;
              event.currentTarget.currentTime = start;
              void event.currentTarget.play().catch(() => setPreviewing(false));
            }}
            onTimeUpdate={(event) => {
              const time = event.currentTarget.currentTime;
              if (time < start - 0.05 || (end != null && time >= end - 0.05)) {
                event.currentTarget.currentTime = start;
              }
            }}
          />
        ) : null}
        <VideoDurationBadge label={item.durationLabel ?? probedLabel} />
        {item.membersOnly ? <span className="yt-card__badge">Members</span> : null}
        <a className="yt-card__cover" href={item.href} tabIndex={-1} aria-label={item.title} />
        <button
          type="button"
          className="yt-card__more"
          aria-label="More actions"
          aria-haspopup="menu"
          aria-expanded={menuPoint != null}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (menuPoint) {
              closeMenu();
              return;
            }
            const rect = event.currentTarget.getBoundingClientRect();
            openMenu(rect.left, rect.bottom + 4);
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="5" r="1.7" />
            <circle cx="12" cy="12" r="1.7" />
            <circle cx="12" cy="19" r="1.7" />
          </svg>
        </button>
      </span>
      <a className="yt-card__body" href={item.href}>
        <span
          className="yt-card__avatar"
          style={{ "--story-color": item.avatarColor } as CSSProperties}
          aria-hidden="true"
        >
          {item.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.avatarUrl} alt="" />
          ) : (
            item.avatarInitials
          )}
        </span>
        <span className="yt-card__copy">
          <span className="yt-card__title">{item.title}</span>
          <span className="yt-card__byline">{item.authorName}</span>
          {item.subtitle ? <span className="yt-card__sub">{item.subtitle}</span> : null}
        </span>
      </a>
      {menuPoint ? <VideoThumbMenu item={item} x={menuPoint.x} y={menuPoint.y} onClose={closeMenu} /> : null}
    </div>
  );
}

export function VideoShelfRail({ items, currentKey = null }: { items: VideoShelfItem[]; currentKey?: string | null }) {
  const prefs = useShelfPrefs();
  const queued = currentKey && prefs.queue.includes(currentKey)
    ? prefs.queue.flatMap((key) => {
        if (key === currentKey) return [];
        const saved = prefs.cards[key];
        if (!saved || isShelfItemHidden(prefs, saved)) return [];
        return [saved];
      })
    : [];
  const visible = queued.length ? queued : visibleShelfItems(items, prefs);
  const heading = queued.length ? "Next in queue" : "Up next";
  return (
    <>
      {visible.length ? (
        <aside className="yt-watch__rail" aria-label={heading}>
          <h2>{heading}</h2>
          <div className="yt-rail__list">
            {visible.map((item) => (
              <VideoShelfCard key={item.key} item={item} layout="row" />
            ))}
          </div>
        </aside>
      ) : null}
      <VideoShelfToast />
    </>
  );
}
