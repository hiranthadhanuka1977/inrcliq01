"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_NAV_ITEMS, NavIcon } from "@/lib/feed/nav-icons";

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

  return (
    <nav className="mobile-nav" aria-label="Primary navigation">
      {MOBILE_NAV_ITEMS.map((item) => {
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
  );
}
