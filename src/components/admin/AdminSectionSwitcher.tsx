"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { SectionMark } from "@/components/admin/SectionMark";
import { ADMIN_SECTIONS, sectionFromPathname } from "@/lib/admin-portal/sections";

export function AdminSectionSwitcher() {
  const pathname = usePathname();
  const section = sectionFromPathname(pathname);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const menuId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    searchRef.current?.focus();

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const needle = query.trim().toLowerCase();
  const sections = ADMIN_SECTIONS.filter(
    (item) => !needle || item.label.toLowerCase().includes(needle) || item.summary.toLowerCase().includes(needle),
  );

  return (
    <div className="admin-switcher" ref={rootRef}>
      <button
        type="button"
        className="admin-switcher__trigger"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="admin-switcher__waffle" aria-hidden="true">
          <svg viewBox="0 0 18 18">
            {[2.2, 9, 15.8].flatMap((y) =>
              [2.2, 9, 15.8].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.35" fill="currentColor" />),
            )}
          </svg>
        </span>
        <span className="admin-switcher__label">{section.label}</span>
        <span className={`admin-switcher__chevron${open ? " is-open" : ""}`} aria-hidden="true">
          <svg viewBox="0 0 12 12">
            <path d="M2.2 4.3 6 8.1l3.8-3.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {open ? (
        <div className="admin-launcher" id={menuId} role="dialog" aria-label="Administration sections">
          <div className="admin-launcher__search">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="9" cy="9" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M13 13.2 16.4 16.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              ref={searchRef}
              type="search"
              value={query}
              placeholder="Find administration sections"
              aria-label="Find administration sections"
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {sections.length ? (
            <div className="admin-launcher__grid">
              {sections.map((item) => {
                const current = item.slug === section.slug;
                return (
                  <Link
                    key={item.slug}
                    href={item.href}
                    className={current ? "admin-launcher__item is-current" : "admin-launcher__item"}
                    aria-current={current ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    <SectionMark icon={item.icon} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="admin-launcher__empty">No sections match.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
