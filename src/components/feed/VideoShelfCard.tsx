"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import VideoDurationBadge from "@/components/feed/VideoDurationBadge";
import VideoThumbMenu, { VideoShelfToast, visibleShelfItems } from "@/components/feed/VideoThumbMenu";
import type { VideoShelfItem } from "@/lib/feed/video-shelf";
import { claimShelfMenu, releaseShelfMenu, subscribeShelfMenu, useShelfPrefs } from "@/lib/feed/video-shelf-menu";

/** Only one card previews at a time. Moving to another card stops the previous one. */
let activePreview: { stop: () => void } | null = null;

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoveringRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [menuPoint, setMenuPoint] = useState<{ x: number; y: number } | null>(null);
  const src = previewSource(item);
  const start = item.playback ? Math.max(0, item.playback.startMs / 1000) : 0;
  const end = item.playback?.endMs != null ? item.playback.endMs / 1000 : null;

  const stop = () => {
    hoveringRef.current = false;
    if (activePreview?.stop === stop) activePreview = null;
    const video = videoRef.current;
    setPlaying(false);
    if (!video) return;
    video.pause();
    if (Number.isFinite(video.duration)) video.currentTime = start;
  };

  const play = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.pointerType === "touch" || !src) return;
    const video = videoRef.current;
    if (!video) return;
    hoveringRef.current = true;
    activePreview?.stop();
    activePreview = { stop };
    setPlaying(true);
    if (video.currentTime < start || (end != null && video.currentTime >= end - 0.05)) {
      video.currentTime = start;
    }
    video.muted = true;
    void video.play().then(() => {
      if (!hoveringRef.current) stop();
    }).catch(() => {
      if (hoveringRef.current) setPlaying(false);
    });
  };

  const closeMenu = useCallback(() => {
    setMenuPoint(null);
    releaseShelfMenu(item.key);
  }, [item.key]);

  const openMenu = (x: number, y: number) => {
    stop();
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
        className={`yt-card__thumb${playing ? " is-previewing" : ""}`}
        onPointerEnter={play}
        onPointerLeave={stop}
      >
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumbnailUrl} alt="" />
        ) : src ? (
          <video
            className="yt-card__still"
            src={`${src}#t=${item.previewSeconds}`}
            muted
            playsInline
            preload="metadata"
            aria-hidden="true"
            tabIndex={-1}
          />
        ) : (
          <span className="yt-card__fallback" />
        )}
        {src ? (
          <video
            ref={videoRef}
            className="yt-card__preview"
            src={src}
            muted
            playsInline
            preload="none"
            loop={end == null}
            aria-hidden="true"
            tabIndex={-1}
            onTimeUpdate={(event) => {
              if (!hoveringRef.current || end == null) return;
              if (event.currentTarget.currentTime >= end - 0.05) {
                event.currentTarget.currentTime = start;
              }
            }}
          />
        ) : null}
        <VideoDurationBadge
          label={item.durationLabel}
          src={src}
          startSeconds={start}
          endSeconds={end}
        />
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

export function VideoShelfRail({ items }: { items: VideoShelfItem[] }) {
  const prefs = useShelfPrefs();
  const visible = visibleShelfItems(items, prefs);
  return (
    <>
      {visible.length ? (
        <aside className="yt-watch__rail" aria-label="Up next">
          <h2>Up next</h2>
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
