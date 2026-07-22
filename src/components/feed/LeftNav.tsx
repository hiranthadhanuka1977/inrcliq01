"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFeedSession } from "@/context/feed/FeedSessionContext";
import { NavIcon, type NavIconName } from "@/lib/feed/nav-icons";

const navItems: {
  label: string;
  href: string;
  icon: NavIconName;
  badge?: string;
}[] = [
  { label: "Home", href: "/feed", icon: "home" },
  { label: "Messages", href: "/feed/messages", icon: "messages" },
  { label: "Snaps", href: "#", icon: "snaps" },
  { label: "Photos", href: "#", icon: "photos" },
  { label: "Videos", href: "#", icon: "videos" },
  { label: "Audio", href: "/feed/audio", icon: "audio" },
  { label: "Explore", href: "#", icon: "explore" },
  { label: "Purchases", href: "#", icon: "purchases" },
  { label: "More", href: "#", icon: "more" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/feed") {
    return pathname === "/feed" || pathname === "/feed/";
  }

  if (href === "#") {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function LeftNav({ firstName }: { firstName?: string | null } = {}) {
  const pathname = usePathname();
  const { firstName: sessionFirstName } = useFeedSession();
  const displayName = (firstName?.trim() || sessionFirstName?.trim() || "You");
  const avatarInitial = displayName === "You" ? "Y" : displayName.charAt(0).toUpperCase();
  const [messagesUnread, setMessagesUnread] = useState(0);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

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
    if (!profileMenuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileMenuOpen]);

  async function handleLogout() {
    if (logoutLoading) return;

    setLogoutLoading(true);
    setProfileMenuOpen(false);

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

  return (
    <aside className="left-nav">
      <div className="left-nav__body">
        <div className="left-nav__header">
          <div className="brand">
            <Link href="/feed" style={{ color: "inherit", textDecoration: "none" }}>
              INRCLIQ<span className="dot">.</span>
            </Link>
          </div>
          <a className="nav-notify" href="#" aria-label="Notifications">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className="nav-notify__dot" aria-hidden="true" />
          </a>
        </div>
        <nav>
          {navItems.map((item, index) => {
            const showTopDivider = item.label === "Snaps";
            const showBottomDivider = item.label === "Audio";
            const active = isActive(pathname, item.href);
            const badge =
              item.href === "/feed/messages" && messagesUnread > 0
                ? String(messagesUnread)
                : item.badge;

            return (
              <div key={item.label}>
                {showTopDivider ? <hr className="nav-separator" /> : null}
                <Link
                  className={`nav-item${active ? " active" : ""}`}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="nav-item__label">
                    <span className={`nav-icon${item.icon === "home" ? " nav-icon--home" : ""}`} aria-hidden="true">
                      <NavIcon name={item.icon} />
                    </span>
                    <span className="nav-item__text">
                      {item.label}
                      {badge ? <span className="badge">{badge}</span> : null}
                    </span>
                  </span>
                </Link>
                {showBottomDivider && index < navItems.length - 1 ? <hr className="nav-separator" /> : null}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="nav-promo">
        <div className="nav-promo__card" role="region" aria-label="Creator tools">
          <div className="nav-promo__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="M7 16l4-5 4 3 5-7" />
            </svg>
          </div>
          <h3 className="nav-promo__title">Go Premium</h3>
          <p className="nav-promo__text">Turn your followers into paying subscribers today.</p>
          <button type="button" className="btn btn--outline-brand btn--sm btn--block nav-promo__btn">
            Unlock Premium Tools
          </button>
        </div>
      </div>

      <div className="nav-create">
        <button type="button" className="nav-create__btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create
        </button>
      </div>

      <div className="nav-profile" ref={profileMenuRef}>
        <a href="#" className="nav-profile__link">
          <span className="nav-profile__avatar" style={{ "--story-color": "#0d9488" } as React.CSSProperties} aria-hidden="true">
            {avatarInitial}
          </span>
          <span className="nav-profile__info">
            <span className="nav-profile__name">{displayName}</span>
            <span className="nav-profile__meta">Your memberships</span>
          </span>
        </a>
        <div className="nav-profile__menu-wrap">
          <button
            type="button"
            className="nav-profile__menu"
            aria-label="Account menu"
            aria-haspopup="menu"
            aria-expanded={profileMenuOpen}
            onClick={() => setProfileMenuOpen((open) => !open)}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="5" r="1.75" />
              <circle cx="12" cy="12" r="1.75" />
              <circle cx="12" cy="19" r="1.75" />
            </svg>
          </button>
          {profileMenuOpen ? (
            <div className="nav-profile__dropdown" role="menu" aria-label="Account menu">
              <button
                type="button"
                className="nav-profile__dropdown-item"
                role="menuitem"
                disabled={logoutLoading}
                onClick={() => void handleLogout()}
              >
                {logoutLoading ? "Logging out…" : "Logout"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
