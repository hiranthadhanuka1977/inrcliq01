"use client";

import { usePathname } from "next/navigation";

const ITEMS = [
  { id: "collection", label: "Collection", href: "/seller-pro" },
  { id: "requests", label: "Service Requests", href: "/seller-pro/service-requests" },
] as const;

export default function ProNav() {
  const path = usePathname();
  const requests = path.startsWith("/seller-pro/service-requests");

  return (
    <nav className="admin-nav" aria-label="Seller Tools">
      {ITEMS.map((item) => {
        const active = item.id === "requests" ? requests : !requests;
        return (
          <a
            key={item.id}
            className={active ? "is-active" : undefined}
            href={item.href}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
