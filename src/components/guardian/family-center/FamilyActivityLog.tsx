"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FamilyActivityItem } from "@/lib/guardian/family-center-static";

const ACTIVITY_TYPE_LABEL: Record<FamilyActivityItem["type"], string> = {
  safety: "Safety",
  control: "Controls",
  account: "Account",
  request: "Request",
};

const PAGE_SIZE = 6;

type ActivityLogRow =
  | { kind: "day"; id: string; label: string }
  | { kind: "entry"; item: FamilyActivityItem };

function buildLogRows(items: FamilyActivityItem[]): ActivityLogRow[] {
  const rows: ActivityLogRow[] = [];
  let lastDay = "";

  for (const item of items) {
    if (item.dayLabel !== lastDay) {
      lastDay = item.dayLabel;
      rows.push({ kind: "day", id: `day-${item.dayLabel}`, label: item.dayLabel });
    }
    rows.push({ kind: "entry", item });
  }

  return rows;
}

export function FamilyActivityLog({
  items,
  showChildName = true,
}: {
  items: FamilyActivityItem[];
  showChildName?: boolean;
}) {
  const [visibleItemCount, setVisibleItemCount] = useState(PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMore = visibleItemCount < items.length;

  const visibleRows = useMemo(
    () => buildLogRows(items.slice(0, visibleItemCount)),
    [items, visibleItemCount],
  );

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return;
    setIsLoading(true);
    window.setTimeout(() => {
      setVisibleItemCount((count) => Math.min(count + PAGE_SIZE, items.length));
      setIsLoading(false);
    }, 350);
  }, [hasMore, isLoading, items.length]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore();
        }
      },
      { rootMargin: "120px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (items.length === 0) {
    return (
      <div className="family-center__empty family-center__empty--tab">
        <h2 className="family-center__empty-title">No activity yet</h2>
        <p className="family-center__empty-copy">
          Safety events, control changes, and account updates for linked minors will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="family-center__activity-log" aria-busy={isLoading}>
      <ol className="family-center__activity-log-list">
        {visibleRows.map((row) =>
          row.kind === "day" ? (
            <li key={row.id} className="family-center__activity-log-day" aria-hidden="true">
              {row.label}
            </li>
          ) : (
            <li key={row.item.id} className="family-center__activity-log-row">
              <div className="family-center__activity-log-main">
                <span
                  className={`family-center__activity-type family-center__activity-type--${row.item.type}`}
                >
                  {ACTIVITY_TYPE_LABEL[row.item.type]}
                </span>
                <div className="family-center__activity-log-copy">
                  <p className="family-center__activity-log-title">
                    <span className="family-center__activity-log-event">{row.item.title}</span>
                    {showChildName ? (
                      <>
                        <span className="family-center__activity-log-sep" aria-hidden="true">
                          ·
                        </span>
                        <span className="family-center__activity-log-child">{row.item.childName}</span>
                      </>
                    ) : null}
                  </p>
                  <p className="family-center__activity-log-detail">{row.item.detail}</p>
                </div>
                <time className="family-center__activity-time">{row.item.timeAgo}</time>
              </div>
            </li>
          ),
        )}
      </ol>

      {hasMore ? (
        <div ref={sentinelRef} className="family-center__activity-log-sentinel" aria-hidden="true" />
      ) : null}

      <p className="family-center__activity-log-status" role="status">
        {isLoading
          ? "Loading more activity…"
          : hasMore
            ? "Scroll for more"
            : "End of activity log"}
      </p>
    </div>
  );
}
