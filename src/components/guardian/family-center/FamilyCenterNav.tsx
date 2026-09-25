"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { FamilyCenterChild } from "@/lib/guardian/family-center";

const NAV_ITEMS: ReadonlyArray<{
  href: string;
  label: string;
  shortLabel?: string;
  exact?: boolean;
  badgeKey?: "alerts" | "requests" | "accounts";
  matchChildDetail?: boolean;
  icon: ReactNode;
}> = [
  {
    href: "/family-circle",
    label: "Overview",
    exact: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    href: "/family-circle/accounts",
    label: "Linked accounts",
    shortLabel: "Accounts",
    badgeKey: "accounts",
    matchChildDetail: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/family-circle/controls",
    label: "Controls",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </svg>
    ),
  },
  {
    href: "/family-circle/alerts",
    label: "Safety alerts",
    shortLabel: "Alerts",
    badgeKey: "alerts",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    href: "/family-circle/requests",
    label: "Requests",
    badgeKey: "requests",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
];

const ALERT_COUNT_POLL_MS = 30_000;

function NavAccountAvatars({ linkedChildren }: { linkedChildren: FamilyCenterChild[] }) {
  const visible = linkedChildren.slice(0, 3);
  const overflow = linkedChildren.length - visible.length;

  return (
    <span
      className={`family-portal-nav__account-avatars${
        visible.length === 1 && overflow === 0 ? " family-portal-nav__account-avatars--single" : ""
      }`}
      aria-hidden="true"
    >
      {visible.map((child) => (
        <span
          key={child.id}
          className="family-portal-nav__account-avatar"
          style={{ "--story-color": child.avatarColor } as CSSProperties}
          title={child.fullName}
        >
          {child.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={child.avatarUrl} alt="" width={20} height={20} />
          ) : (
            child.avatarInitials
          )}
        </span>
      ))}
      {overflow > 0 ? (
        <span className="family-portal-nav__account-avatar family-portal-nav__account-avatar--more">
          +{overflow}
        </span>
      ) : null}
    </span>
  );
}

export function FamilyCenterNav({
  alertCount = 0,
  requestCount = 0,
  accountCount = 0,
  linkedChildren = [],
}: {
  alertCount?: number;
  requestCount?: number;
  accountCount?: number;
  linkedChildren?: FamilyCenterChild[];
}) {
  const pathname = usePathname();
  const [liveAlertCount, setLiveAlertCount] = useState(alertCount);

  useEffect(() => {
    setLiveAlertCount(alertCount);
  }, [alertCount]);

  useEffect(() => {
    let cancelled = false;

    async function refreshAlertCount() {
      try {
        const response = await fetch("/api/family-circle/alerts", {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = (await response.json()) as { unresolvedCount?: number };
        if (!cancelled && typeof data.unresolvedCount === "number") {
          setLiveAlertCount(data.unresolvedCount);
        }
      } catch {
        // Keep the last known count if the poll fails.
      }
    }

    void refreshAlertCount();
    const intervalId = window.setInterval(() => {
      void refreshAlertCount();
    }, ALERT_COUNT_POLL_MS);

    function onVisibility() {
      if (document.visibilityState === "visible") {
        void refreshAlertCount();
      }
    }

    function onAlertsChanged() {
      void refreshAlertCount();
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);
    window.addEventListener("family-circle:alerts-changed", onAlertsChanged);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
      window.removeEventListener("family-circle:alerts-changed", onAlertsChanged);
    };
  }, [pathname]);

  function badgeFor(key?: "alerts" | "requests" | "accounts") {
    if (key === "alerts" && liveAlertCount > 0) return liveAlertCount;
    if (key === "requests" && requestCount > 0) return requestCount;
    if (key === "accounts" && accountCount > 0 && linkedChildren.length === 0) return accountCount;
    return null;
  }

  return (
    <nav className="family-portal-nav" aria-label="Family Circle">
      <p className="family-portal-nav__label">Manage</p>
      <ul className="family-portal-nav__list">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href || pathname === `${item.href}/`
            : item.matchChildDetail
              ? pathname === item.href ||
                pathname.startsWith(`${item.href}/`)
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const badge = badgeFor(item.badgeKey);
          const showAccountAvatars = item.badgeKey === "accounts" && linkedChildren.length > 0;
          const ariaLabel =
            item.badgeKey === "alerts" && badge != null
              ? `${item.label}, ${badge} new`
              : item.label;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`family-portal-nav__link${isActive ? " is-active" : ""}${showAccountAvatars ? " family-portal-nav__link--accounts" : ""}`}
                aria-current={isActive ? "page" : undefined}
                aria-label={ariaLabel}
              >
                <span
                  className={`family-portal-nav__icon${showAccountAvatars ? " family-portal-nav__icon--accounts" : ""}`}
                >
                  <span className="family-portal-nav__icon-fallback">{item.icon}</span>
                  {showAccountAvatars ? <NavAccountAvatars linkedChildren={linkedChildren} /> : null}
                </span>
                <span className="family-portal-nav__text">
                  <span className="family-portal-nav__text-full">{item.label}</span>
                  {item.shortLabel ? (
                    <span className="family-portal-nav__text-short">{item.shortLabel}</span>
                  ) : null}
                </span>
                {badge != null ? (
                  <span
                    className={`family-portal-nav__badge${
                      item.badgeKey === "alerts" ? " family-portal-nav__badge--alert" : ""
                    }`}
                    aria-hidden="true"
                  >
                    {badge > 99 ? "99+" : badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
