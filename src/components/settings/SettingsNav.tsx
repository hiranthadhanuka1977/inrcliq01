"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SETTINGS_RESET_ENABLED } from "@/lib/settings/access";

const NAV_ITEMS = [
  {
    href: "/settings/dashboard",
    label: "Dashboard",
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
    href: "/settings/users",
    label: "Users",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/settings/feed-mgmt",
    label: "Feed Mgmt",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M7 8h10" />
        <path d="M7 12h10" />
        <path d="M7 16h6" />
      </svg>
    ),
  },
  {
    href: "/settings/reset",
    label: "Reset",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M23 4v6h-6" />
        <path d="M1 20v-6h6" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    ),
  },
] as const satisfies ReadonlyArray<{
  href: string;
  label: string;
  icon: ReactNode;
}>;

function isNavItemDisabled(href: string) {
  return href === "/settings/reset" && !SETTINGS_RESET_ENABLED;
}

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="settings-nav" aria-label="Settings">
      <ul className="settings-nav__list">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          if (isNavItemDisabled(item.href)) {
            return (
              <li key={item.href}>
                <span
                  className="settings-nav__link is-disabled"
                  aria-disabled="true"
                  title={`${item.label} is disabled`}
                >
                  <span className="settings-nav__icon">{item.icon}</span>
                  {item.label}
                </span>
              </li>
            );
          }

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`settings-nav__link${isActive ? " is-active" : ""}`}
              >
                <span className="settings-nav__icon">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
