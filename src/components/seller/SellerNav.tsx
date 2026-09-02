"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV_ITEMS: ReadonlyArray<{
  href: string;
  label: string;
  shortLabel?: string;
  exact?: boolean;
  requiresSpecialRequests?: boolean;
  icon: ReactNode;
}> = [
  {
    href: "/seller",
    label: "Dashboard",
    shortLabel: "Home",
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
    href: "/seller/collection",
    label: "Collection",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    href: "/seller/service-requests",
    label: "Service requests",
    shortLabel: "Requests",
    requiresSpecialRequests: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="m9 16 2 2 4-4" />
      </svg>
    ),
  },
  {
    href: "/seller/subscriptions",
    label: "Subscriptions",
    shortLabel: "Subs",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 2l2.4 4.86L20 8.27l-4 3.9.94 5.5L12 15.77 7.06 17.67 8 12.17l-4-3.9 5.6-.41L12 2z" />
      </svg>
    ),
  },
  {
    href: "/seller/wallet",
    label: "My Money (Wallet)",
    shortLabel: "Wallet",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M19 7H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
        <path d="M16 11a2 2 0 1 0 0-4H5" />
        <path d="M2 7V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2" />
      </svg>
    ),
  },
  {
    href: "/seller/settings",
    label: "Settings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </svg>
    ),
  },
];

export function SellerNav({ hasSpecialRequests = false }: { hasSpecialRequests?: boolean }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter(
    (item) => !item.requiresSpecialRequests || hasSpecialRequests,
  );

  return (
    <nav className="seller-nav" aria-label="Seller Tools">
      <p className="seller-nav__label">Manage</p>
      <ul className="seller-nav__list" data-count={items.length}>
        {items.map((item) => {
          const isActive = item.exact
            ? pathname === item.href || pathname === `${item.href}/`
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`seller-nav__link${isActive ? " is-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
              >
                <span className="seller-nav__icon">{item.icon}</span>
                <span className="seller-nav__text">
                  <span className="seller-nav__text-full">{item.label}</span>
                  {item.shortLabel ? (
                    <span className="seller-nav__text-short">{item.shortLabel}</span>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
