"use client";

import { useState, type ReactNode } from "react";

interface CategoryFiltersProps {
  categories: string[];
  activeCategory: string | null;
  onChange: (category: string | null) => void;
  children: ReactNode;
}

function labelFor(category: string): string {
  if (category === "discovery") return "Discovery";
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="feed-filters__toggle-icon">
      <path
        d="M4 7h16M7 12h10M10 17h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="9" cy="7" r="2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="17" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function CategoryFilters({ categories, activeCategory, onChange, children }: CategoryFiltersProps) {
  const [expanded, setExpanded] = useState(false);
  const tabs = ["All", ...categories.map(labelFor)];
  const hasActiveFilter = activeCategory !== null;

  return (
    <section
      className={`feed-filters feed-filters--audio feed-filters--collapsible feed-filters--in-feed feed-landing${expanded ? " is-expanded" : ""}`}
      aria-label="Feed categories"
    >
      <div className="feed-landing__header">
        {children}
        <button
          type="button"
          className={`feed-filters__toggle${hasActiveFilter ? " has-active-filter" : ""}`}
          aria-expanded={expanded}
          aria-controls="home-feed-filter-pills"
          aria-label={expanded ? "Hide category filters" : "Show category filters"}
          onClick={() => setExpanded((open) => !open)}
        >
          <FilterIcon />
        </button>
      </div>

      <div
        className="feed-filters__pills-wrap"
        id="home-feed-filter-pills"
        aria-hidden={!expanded}
      >
        <div className="feed-filters__pills-inner">
          <div className="feed-filters__track feed-filters__track--audio" role="tablist">
            {tabs.map((tab, index) => {
            const value = tab === "All" ? null : tab.toLowerCase() === "discovery" ? "discovery" : tab.toLowerCase();
            const selected = activeCategory === value || (tab === "All" && activeCategory === null);

            return (
              <span
                key={tab}
                className={`feed-filter-item${selected ? " is-active" : ""}`}
                data-filter={value ?? "All"}
                style={{ "--pill-index": index } as React.CSSProperties}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className="feed-filter"
                  onClick={() => onChange(value)}
                >
                  <span className="feed-filter__label">{tab}</span>
                </button>
              </span>
            );
          })}
          </div>
        </div>
      </div>
    </section>
  );
}
