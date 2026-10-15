"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavItemActive, sectionFromPathname } from "@/lib/admin-portal/sections";

export function AdminNav() {
  const pathname = usePathname();
  const section = sectionFromPathname(pathname);

  return (
    <nav className="admin-nav" aria-label={section.label}>
      {section.nav.map((item) => {
        const active = isNavItemActive(pathname, item);
        return (
          <Link key={item.href} href={item.href} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
