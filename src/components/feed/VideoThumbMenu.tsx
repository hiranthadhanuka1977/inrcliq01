"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type SVGProps } from "react";
import { createPortal } from "react-dom";
import {
  authorShelfKey,
  createShelfPlaylist,
  dismissShelfToast,
  hideShelfAuthor,
  hideShelfVideo,
  isShelfItemHidden,
  reportShelfVideo,
  showShelfToast,
  togglePlaylistVideo,
  toggleShelfQueue,
  toggleWatchLater,
  useShelfPrefs,
  useShelfToast,
  type ShelfPrefs,
} from "@/lib/feed/video-shelf-menu";
import type { VideoShelfItem } from "@/lib/feed/video-shelf";

const REPORT_REASONS = [
  "Sexual content",
  "Violent or repulsive content",
  "Hateful or abusive content",
  "Harassment or bullying",
  "Harmful or dangerous acts",
  "Misinformation",
  "Spam or misleading",
];

function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props} />
  );
}

function QueueIcon() {
  return (
    <Icon>
      <path d="M4 6h16M4 12h10M4 18h7" strokeLinecap="round" />
      <path d="M17 14v6M14 17h6" strokeLinecap="round" />
    </Icon>
  );
}

function ClockIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  );
}

function PlaylistIcon() {
  return (
    <Icon>
      <path d="M5 6h14M5 12h14M5 18h8" strokeLinecap="round" />
    </Icon>
  );
}

function ShareIcon() {
  return (
    <Icon>
      <circle cx="7" cy="12" r="2.2" />
      <circle cx="17" cy="7" r="2.2" />
      <circle cx="17" cy="17" r="2.2" />
      <path d="m9 11 6-3.2M9 13l6 3.2" />
    </Icon>
  );
}

function SlashIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="8" />
      <path d="m7 17 10-10" strokeLinecap="round" />
    </Icon>
  );
}

function PersonSlashIcon() {
  return (
    <Icon>
      <circle cx="10" cy="8" r="2.4" />
      <path d="M5.5 18.5c.6-2.6 2.4-4 4.5-4 1.2 0 2.2.4 3.1 1.1" strokeLinecap="round" />
      <path d="m5 19 14-14" strokeLinecap="round" />
    </Icon>
  );
}

function FlagIcon() {
  return (
    <Icon>
      <path d="M6 4v16" strokeLinecap="round" />
      <path d="M6 5h11l-2 3.5L17 12H6" strokeLinejoin="round" />
    </Icon>
  );
}

function ChevronIcon() {
  return (
    <Icon className="yt-menu__chevron">
      <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  );
}

function CheckIcon() {
  return (
    <Icon className="yt-menu__check">
      <path d="m5 12 5 5L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  );
}

function MenuRow({
  icon,
  label,
  checked,
  submenu,
  onClick,
  onMouseEnter,
}: {
  icon: ReactNode;
  label: string;
  checked?: boolean;
  submenu?: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
}) {
  return (
    <button type="button" className="yt-menu__item" role="menuitem" onClick={onClick} onMouseEnter={onMouseEnter}>
      <span className="yt-menu__icon">{checked ? <CheckIcon /> : icon}</span>
      <span className="yt-menu__label">{label}</span>
      {submenu ? <ChevronIcon /> : null}
    </button>
  );
}

export default function VideoThumbMenu({
  item,
  x,
  y,
  onClose,
}: {
  item: VideoShelfItem;
  x: number;
  y: number;
  onClose: () => void;
}) {
  const prefs = useShelfPrefs();
  const menuRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [panel, setPanel] = useState<"playlist" | "report" | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [pos, setPos] = useState({ left: x, top: y });
  const [flip, setFlip] = useState(false);
  const [placed, setPlaced] = useState(false);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };
    const onScroll = () => onClose();
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [onClose]);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const rect = menu.getBoundingClientRect();
    const pad = 8;
    let left = x;
    let top = y;
    if (left + rect.width > window.innerWidth - pad) left = window.innerWidth - rect.width - pad;
    if (top + rect.height > window.innerHeight - pad) top = Math.max(pad, y - rect.height);
    left = Math.max(pad, left);
    top = Math.max(pad, top);
    setPos((current) => (current.left === left && current.top === top ? current : { left, top }));

    const sub = subRef.current;
    if (sub) {
      const shouldFlip = left + rect.width + 6 + sub.offsetWidth > window.innerWidth - pad;
      setFlip((current) => (current === shouldFlip ? current : shouldFlip));
      const subBottom = top + sub.offsetHeight;
      if (subBottom > window.innerHeight - pad) {
        const nextTop = Math.max(pad, top - (subBottom - (window.innerHeight - pad)));
        top = nextTop;
        setPos((current) => (current.left === left && current.top === nextTop ? current : { left, top: nextTop }));
      }
    } else {
      setFlip((current) => (current ? false : current));
    }
    setPlaced(true);
  }, [x, y, panel, creating]);

  useLayoutEffect(() => {
    menuRef.current?.querySelector<HTMLElement>("[role='menuitem']")?.focus({ preventScroll: true });
  }, []);

  useLayoutEffect(() => {
    if (creating) nameRef.current?.focus();
  }, [creating]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (panel) {
        setPanel(null);
        setCreating(false);
        return;
      }
      onClose();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return;
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']") ?? []);
    if (!items.length) return;
    event.preventDefault();
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Home") items[0]?.focus();
    else if (event.key === "End") items[items.length - 1]?.focus();
    else if (event.key === "ArrowDown") items[(index + 1) % items.length]?.focus();
    else items[(index - 1 + items.length) % items.length]?.focus();
  };

  const share = async () => {
    const url = new URL(item.href, window.location.origin).toString();
    let copied = false;
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch {
      const area = document.createElement("textarea");
      area.value = url;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      copied = document.execCommand("copy");
      area.remove();
    }
    showShelfToast(copied ? "Link copied to clipboard" : "Couldn't copy the link");
    onClose();
  };

  const queued = prefs.queue.includes(item.key);
  const saved = prefs.watchLater.includes(item.key);

  return createPortal(
    <div
      ref={menuRef}
      className="yt-menu"
      role="menu"
      aria-label={`Actions for ${item.title}`}
      style={{ left: pos.left, top: pos.top, visibility: placed ? "visible" : "hidden" }}
      onKeyDown={onKeyDown}
      onContextMenu={(event) => event.preventDefault()}
    >
      <MenuRow
        icon={<QueueIcon />}
        label={queued ? "Remove from queue" : "Add to queue"}
        onMouseEnter={() => setPanel(null)}
        onClick={() => {
          toggleShelfQueue(item);
          onClose();
        }}
      />
      <MenuRow
        icon={<ClockIcon />}
        label={saved ? "Remove from Watch later" : "Save to Watch later"}
        onMouseEnter={() => setPanel(null)}
        onClick={() => {
          toggleWatchLater(item);
          onClose();
        }}
      />
      <MenuRow
        icon={<PlaylistIcon />}
        label="Save to playlist"
        submenu
        onMouseEnter={() => setPanel("playlist")}
        onClick={() => setPanel("playlist")}
      />
      <MenuRow
        icon={<ShareIcon />}
        label="Share"
        onMouseEnter={() => setPanel(null)}
        onClick={() => void share()}
      />
      <div className="yt-menu__sep" role="separator" />
      <MenuRow
        icon={<SlashIcon />}
        label="Not interested"
        onMouseEnter={() => setPanel(null)}
        onClick={() => {
          hideShelfVideo(item.key);
          onClose();
        }}
      />
      <MenuRow
        icon={<PersonSlashIcon />}
        label="Don't recommend channel"
        onMouseEnter={() => setPanel(null)}
        onClick={() => {
          hideShelfAuthor(authorShelfKey(item), item.authorName);
          onClose();
        }}
      />
      <MenuRow
        icon={<FlagIcon />}
        label="Report"
        submenu
        onMouseEnter={() => setPanel("report")}
        onClick={() => setPanel("report")}
      />
      {panel === "playlist" ? (
        <div ref={subRef} className={`yt-menu__sub${flip ? " is-flip" : ""}`} role="menu" aria-label="Save to playlist">
          <p className="yt-menu__heading">Save to…</p>
          <MenuRow
            icon={<ClockIcon />}
            label="Watch later"
            checked={saved}
            onClick={() => toggleWatchLater(item)}
          />
          {prefs.playlists.map((playlist) => (
            <MenuRow
              key={playlist.id}
              icon={<PlaylistIcon />}
              label={playlist.name}
              checked={playlist.keys.includes(item.key)}
              onClick={() => togglePlaylistVideo(playlist.id, item)}
            />
          ))}
          {creating ? (
            <form
              className="yt-menu__create"
              onSubmit={(event) => {
                event.preventDefault();
                if (createShelfPlaylist(name, item)) {
                  setName("");
                  setCreating(false);
                }
              }}
            >
              <input
                ref={nameRef}
                value={name}
                maxLength={60}
                placeholder="Playlist name"
                aria-label="Playlist name"
                onChange={(event) => setName(event.target.value)}
              />
              <button type="submit" disabled={!name.trim()}>
                Create
              </button>
            </form>
          ) : (
            <button type="button" className="yt-menu__item" role="menuitem" onClick={() => setCreating(true)}>
              <span className="yt-menu__icon">
                <QueueIcon />
              </span>
              <span className="yt-menu__label">Create new playlist</span>
            </button>
          )}
        </div>
      ) : null}
      {panel === "report" ? (
        <div ref={subRef} className={`yt-menu__sub${flip ? " is-flip" : ""}`} role="menu" aria-label="Report">
          <p className="yt-menu__heading">Report</p>
          <p className="yt-menu__note">This hides the video for you.</p>
          {REPORT_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              className="yt-menu__item"
              role="menuitem"
              onClick={() => {
                reportShelfVideo(item.key, reason);
                onClose();
              }}
            >
              <span className="yt-menu__label">{reason}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>,
    document.body,
  );
}

export function VideoShelfToast() {
  const toast = useShelfToast();
  if (!toast) return null;
  return createPortal(
    <div className="yt-toast" role="status">
      <p>{toast.message}</p>
      {toast.undo ? (
        <button
          type="button"
          onClick={() => {
            toast.undo?.();
          }}
        >
          Undo
        </button>
      ) : (
        <button type="button" aria-label="Dismiss" onClick={dismissShelfToast}>
          ✕
        </button>
      )}
    </div>,
    document.body,
  );
}

export function visibleShelfItems(items: VideoShelfItem[], prefs: ShelfPrefs) {
  return items.filter((item) => !isShelfItemHidden(prefs, item));
}
