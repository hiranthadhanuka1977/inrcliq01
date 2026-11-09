"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {direction === "left" ? <path d="m14.5 6-6 6 6 6" /> : <path d="m9.5 6 6 6-6 6" />}
    </svg>
  );
}

export default function ShelfScroller({
  children,
  label,
  align = "cards",
  resetKey = "",
}: {
  children: ReactNode;
  label: string;
  align?: "cards" | "people";
  resetKey?: string;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const edgesRef = useRef(edges);

  const update = () => {
    const row = rowRef.current;
    if (!row) return;
    const max = row.scrollWidth - row.clientWidth;
    const next = {
      left: row.scrollLeft > 4,
      right: max > 4 && row.scrollLeft < max - 4,
    };
    const previous = edgesRef.current;
    if (previous.left === next.left && previous.right === next.right) return;
    edgesRef.current = next;
    setEdges(next);
  };

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    row.scrollLeft = 0;
    update();
    const onWheel = (event: WheelEvent) => {
      if (row.scrollWidth <= row.clientWidth + 4) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const max = row.scrollWidth - row.clientWidth;
      const next = Math.min(max, Math.max(0, row.scrollLeft + event.deltaY));
      if (next === row.scrollLeft) return;
      event.preventDefault();
      row.scrollLeft = next;
    };
    row.addEventListener("scroll", update, { passive: true });
    row.addEventListener("wheel", onWheel, { passive: false });
    const observer = new ResizeObserver(update);
    observer.observe(row);
    return () => {
      row.removeEventListener("scroll", update);
      row.removeEventListener("wheel", onWheel);
      observer.disconnect();
    };
  }, [resetKey]);

  const move = (direction: -1 | 1) => {
    const row = rowRef.current;
    if (!row) return;
    const card = row.querySelector<HTMLElement>(":scope > *");
    const styles = getComputedStyle(row);
    const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0;
    const step = card ? card.getBoundingClientRect().width + gap : row.clientWidth;
    const visible = Math.max(1, Math.floor((row.clientWidth + gap) / step));
    row.scrollBy({ left: direction * visible * step, behavior: "smooth" });
  };

  return (
    <div className={`yt-scroller yt-scroller--${align}`}>
      {edges.left ? (
        <button type="button" className="yt-scroller__btn yt-scroller__btn--prev" aria-label={`Scroll ${label} back`} onClick={() => move(-1)}>
          <Chevron direction="left" />
        </button>
      ) : null}
      <div ref={rowRef} className="yt-scroller__row">
        {children}
      </div>
      {edges.left ? <div className="yt-scroller__fade yt-scroller__fade--left" aria-hidden="true" /> : null}
      {edges.right ? <div className="yt-scroller__fade yt-scroller__fade--right" aria-hidden="true" /> : null}
      {edges.right ? (
        <button type="button" className="yt-scroller__btn yt-scroller__btn--next" aria-label={`Scroll ${label} forward`} onClick={() => move(1)}>
          <Chevron direction="right" />
        </button>
      ) : null}
    </div>
  );
}
