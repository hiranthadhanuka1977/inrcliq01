"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import CreatePostModal from "@/components/feed/account/CreatePostModal";
import { useFeedSession } from "@/context/feed/FeedSessionContext";
import { useFeedTheme } from "@/context/feed/FeedThemeContext";
import {
  MOBILE_MEDIA_ITEMS,
  MOBILE_MORE_ITEMS,
  MOBILE_NAV_ITEMS,
  NavIcon,
  type NavIconName,
} from "@/lib/feed/nav-icons";

const MEDIA_SELECTION_KEY = "inrcliq_mobile_media_selection";

type MediaSelection = (typeof MOBILE_MEDIA_ITEMS)[number]["icon"];

function isActive(pathname: string, href: string): boolean {
  if (href === "/feed") {
    return pathname === "/feed" || pathname === "/feed/";
  }

  if (href === "#") {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function isMediaRouteActive(pathname: string): boolean {
  return (
    pathname === "/feed/audio" ||
    pathname.startsWith("/feed/audio/") ||
    pathname === "/feed/snaps" ||
    pathname.startsWith("/feed/snaps/") ||
    pathname === "/feed/photos" ||
    pathname.startsWith("/feed/photos/") ||
    pathname === "/feed/videos" ||
    pathname.startsWith("/feed/videos/")
  );
}

function mediaSelectionFromPath(pathname: string): MediaSelection | null {
  if (pathname === "/feed/snaps" || pathname.startsWith("/feed/snaps/")) return "snaps";
  if (pathname === "/feed/photos" || pathname.startsWith("/feed/photos/")) return "photos";
  if (pathname === "/feed/videos" || pathname.startsWith("/feed/videos/")) return "videos";
  if (pathname === "/feed/audio" || pathname.startsWith("/feed/audio/")) return "audio";
  return null;
}

function isMediaSelection(value: string | null): value is MediaSelection {
  return MOBILE_MEDIA_ITEMS.some((item) => item.icon === value);
}

function readStoredMediaSelection(): MediaSelection | null {
  if (typeof window === "undefined") return null;
  try {
    const value = sessionStorage.getItem(MEDIA_SELECTION_KEY);
    return isMediaSelection(value) ? value : null;
  } catch {
    return null;
  }
}

function writeStoredMediaSelection(value: MediaSelection) {
  try {
    sessionStorage.setItem(MEDIA_SELECTION_KEY, value);
  } catch {
    // Ignore storage failures in private mode.
  }
}

function mediaItemForSelection(selection: MediaSelection | null) {
  return (
    MOBILE_MEDIA_ITEMS.find((item) => item.icon === selection) ??
    MOBILE_MEDIA_ITEMS[0]
  );
}

type SheetKind = "media" | "more" | null;

export default function MobileNav() {
  const pathname = usePathname();
  const { firstName, verified } = useFeedSession();
  const { theme, toggleTheme } = useFeedTheme();
  const [openSheet, setOpenSheet] = useState<SheetKind>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaSelection | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [messagesUnread, setMessagesUnread] = useState(0);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const mediaSheetId = useId();
  const moreSheetId = useId();
  const mediaButtonRef = useRef<HTMLButtonElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const pathMedia = mediaSelectionFromPath(pathname);
  const effectiveMedia: MediaSelection | null = pathMedia ?? selectedMedia;

  useEffect(() => {
    if (pathMedia) return;
    const stored = readStoredMediaSelection();
    if (stored) {
      setSelectedMedia(stored);
    }
  }, [pathMedia]);

  useEffect(() => {
    if (!pathMedia) return;
    setSelectedMedia(pathMedia);
    writeStoredMediaSelection(pathMedia);
  }, [pathMedia]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/feed/messages", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { unreadTotal?: number } | null) => {
        if (!cancelled && data?.unreadTotal != null) {
          setMessagesUnread(Number(data.unreadTotal) || 0);
        }
      })
      .catch(() => {
        // Badge stays at 0 when offline/unauthenticated.
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (!openSheet) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        sheetRef.current?.contains(target) ||
        mediaButtonRef.current?.contains(target) ||
        moreButtonRef.current?.contains(target)
      ) {
        return;
      }
      setOpenSheet(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenSheet(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [openSheet]);

  async function handleLogout() {
    if (logoutLoading) return;

    setLogoutLoading(true);
    setOpenSheet(null);

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        setLogoutLoading(false);
        return;
      }

      window.location.assign(data.redirectTo ?? "/");
    } catch {
      setLogoutLoading(false);
    }
  }

  function toggleSheet(kind: Exclude<SheetKind, null>) {
    setOpenSheet((current) => (current === kind ? null : kind));
  }

  function selectMedia(icon: MediaSelection) {
    setSelectedMedia(icon);
    writeStoredMediaSelection(icon);
    setOpenSheet(null);
  }

  const activeMediaItem = mediaItemForSelection(effectiveMedia);
  const mediaTabIcon = (effectiveMedia ?? "media") as NavIconName;
  const mediaTabLabel = effectiveMedia ? activeMediaItem.label : "Media";

  return (
    <>
      {openSheet === "media" ? (
        <div className="mobile-more mobile-media" role="presentation">
          <button
            type="button"
            className="mobile-more__backdrop"
            aria-label="Close media menu"
            onClick={() => setOpenSheet(null)}
          />
          <div
            ref={sheetRef}
            id={mediaSheetId}
            className="mobile-more__sheet mobile-media__sheet"
            role="menu"
            aria-label="Media"
          >
            <div className="mobile-more__handle" aria-hidden="true" />
            <p className="mobile-media__title">Media</p>
            <ul className="mobile-media__grid">
              {MOBILE_MEDIA_ITEMS.map((item) => {
                const selected = effectiveMedia === item.icon;

                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className={`mobile-media__item${selected ? " is-active" : ""}`}
                      role="menuitem"
                      aria-current={selected ? "page" : undefined}
                      onClick={() => selectMedia(item.icon)}
                    >
                      <span className="nav-icon" aria-hidden="true">
                        <NavIcon name={item.icon} />
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}

      {openSheet === "more" ? (
        <div className="mobile-more" role="presentation">
          <button
            type="button"
            className="mobile-more__backdrop"
            aria-label="Close more menu"
            onClick={() => setOpenSheet(null)}
          />
          <div
            ref={sheetRef}
            id={moreSheetId}
            className="mobile-more__sheet"
            role="menu"
            aria-label="More"
          >
            <div className="mobile-more__handle" aria-hidden="true" />
            <ul className="mobile-more__list">
              {MOBILE_MORE_ITEMS.map((item) => {
                const active = isActive(pathname, item.href);
                const action = "action" in item ? item.action : undefined;
                const isLogout = action === "logout";
                const isTheme = action === "theme";

                return (
                  <li key={item.label}>
                    {isLogout ? (
                      <button
                        type="button"
                        className="mobile-more__item mobile-more__item--danger"
                        role="menuitem"
                        disabled={logoutLoading}
                        onClick={() => void handleLogout()}
                      >
                        <span className="nav-icon" aria-hidden="true">
                          <NavIcon name={item.icon} />
                        </span>
                        <span>{logoutLoading ? "Logging out…" : item.label}</span>
                      </button>
                    ) : isTheme ? (
                      <button
                        type="button"
                        className="mobile-more__item"
                        role="menuitem"
                        onClick={() => {
                          toggleTheme();
                          setOpenSheet(null);
                        }}
                      >
                        <span className="nav-icon" aria-hidden="true">
                          <NavIcon name={item.icon} />
                        </span>
                        <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
                      </button>
                    ) : (
                      <Link
                        href={item.href}
                        className={`mobile-more__item${active ? " is-active" : ""}`}
                        role="menuitem"
                        aria-current={active ? "page" : undefined}
                        onClick={() => setOpenSheet(null)}
                      >
                        <span className="nav-icon" aria-hidden="true">
                          <NavIcon name={item.icon} />
                        </span>
                        <span>{item.label}</span>
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}

      <CreatePostModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        firstName={firstName?.trim() || null}
        verified={verified}
      />

      <nav className="mobile-nav" aria-label="Primary navigation">
        {MOBILE_NAV_ITEMS.map((item) => {
          const action = "action" in item ? item.action : undefined;

          if (action === "create") {
            return (
              <div key={item.label} className="mobile-nav__create">
                <button
                  type="button"
                  className="mobile-nav__create-btn"
                  aria-label="Create"
                  aria-haspopup="dialog"
                  aria-expanded={createOpen}
                  onClick={() => {
                    setOpenSheet(null);
                    setCreateOpen(true);
                  }}
                >
                  <NavIcon name="create" />
                </button>
              </div>
            );
          }

          if (item.label === "Media") {
            const mediaActive =
              openSheet === "media" ||
              isMediaRouteActive(pathname) ||
              (Boolean(effectiveMedia) && !isActive(pathname, "/feed"));
            return (
              <button
                key={item.label}
                ref={mediaButtonRef}
                type="button"
                className={mediaActive ? "active" : undefined}
                aria-label={mediaTabLabel}
                aria-haspopup="menu"
                aria-expanded={openSheet === "media"}
                aria-controls={mediaSheetId}
                onClick={() => toggleSheet("media")}
              >
                <span className="nav-icon" aria-hidden="true">
                  <NavIcon name={mediaTabIcon} />
                </span>
                {mediaTabLabel}
              </button>
            );
          }

          if (item.label === "More") {
            return (
              <button
                key={item.label}
                ref={moreButtonRef}
                type="button"
                className={openSheet === "more" ? "active" : undefined}
                aria-label="More"
                aria-haspopup="menu"
                aria-expanded={openSheet === "more"}
                aria-controls={moreSheetId}
                onClick={() => toggleSheet("more")}
              >
                <span className="nav-icon" aria-hidden="true">
                  <NavIcon name={item.icon} />
                </span>
                More
              </button>
            );
          }

          const active = isActive(pathname, item.href);
          const showMessagesBadge = item.href === "/feed/messages" && messagesUnread > 0;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={active ? "active" : undefined}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={`nav-icon${item.icon === "home" ? " nav-icon--home" : ""}${showMessagesBadge ? " nav-icon--badged" : ""}`}
                aria-hidden="true"
              >
                <NavIcon name={item.icon} />
                {showMessagesBadge ? (
                  <span className="mobile-nav__badge">{messagesUnread > 99 ? "99+" : messagesUnread}</span>
                ) : null}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
