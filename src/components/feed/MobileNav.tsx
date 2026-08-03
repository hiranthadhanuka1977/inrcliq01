"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { MOBILE_MORE_ITEMS, MOBILE_NAV_ITEMS, NavIcon } from "@/lib/feed/nav-icons";

function isActive(pathname: string, href: string): boolean {
  if (href === "/feed") {
    return pathname === "/feed" || pathname === "/feed/";
  }

  if (href === "#") {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const sheetId = useId();
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (sheetRef.current?.contains(target) || moreButtonRef.current?.contains(target)) {
        return;
      }
      setMoreOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMoreOpen(false);
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
  }, [moreOpen]);

  async function handleLogout() {
    if (logoutLoading) return;

    setLogoutLoading(true);
    setMoreOpen(false);

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
    <>
      {moreOpen ? (
        <div className="mobile-more" role="presentation">
          <button
            type="button"
            className="mobile-more__backdrop"
            aria-label="Close more menu"
            onClick={() => setMoreOpen(false)}
          />
          <div
            ref={sheetRef}
            id={sheetId}
            className="mobile-more__sheet"
            role="menu"
            aria-label="More"
          >
            <div className="mobile-more__handle" aria-hidden="true" />
            <ul className="mobile-more__list">
              {MOBILE_MORE_ITEMS.map((item) => {
                const active = isActive(pathname, item.href);
                const isLogout = "action" in item && item.action === "logout";

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
                    ) : (
                      <Link
                        href={item.href}
                        className={`mobile-more__item${active ? " is-active" : ""}`}
                        role="menuitem"
                        aria-current={active ? "page" : undefined}
                        onClick={() => setMoreOpen(false)}
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

      <nav className="mobile-nav" aria-label="Primary navigation">
        {MOBILE_NAV_ITEMS.map((item) => {
          if (item.label === "More") {
            return (
              <button
                key={item.label}
                ref={moreButtonRef}
                type="button"
                className={moreOpen ? "active" : undefined}
                aria-label="More"
                aria-haspopup="menu"
                aria-expanded={moreOpen}
                aria-controls={sheetId}
                onClick={() => setMoreOpen((open) => !open)}
              >
                <span className="nav-icon" aria-hidden="true">
                  <NavIcon name={item.icon} />
                </span>
                More
              </button>
            );
          }

          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={active ? "active" : undefined}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
            >
              <span className={`nav-icon${item.icon === "home" ? " nav-icon--home" : ""}`} aria-hidden="true">
                <NavIcon name={item.icon} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
