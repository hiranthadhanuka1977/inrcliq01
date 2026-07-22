"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FeedItem } from "@/types/feed/feed";

const INITIAL_COUNT = 10;
const PAGE_SIZE = 10;
const LOAD_MORE_MS = 500;

export function useFeedPagination(items: FeedItem[]) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreIdRef = useRef(0);

  useEffect(() => {
    setVisibleCount(INITIAL_COUNT);
    setIsLoadingMore(false);
  }, [items]);

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = visibleCount < items.length;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;

        const loadId = ++loadMoreIdRef.current;
        setIsLoadingMore(true);

        window.setTimeout(() => {
          if (loadMoreIdRef.current !== loadId) return;
          setVisibleCount((count) => Math.min(count + PAGE_SIZE, items.length));
          setIsLoadingMore(false);
        }, LOAD_MORE_MS);
      },
      { rootMargin: "320px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, items.length]);

  return { visibleItems, hasMore, isLoadingMore, sentinelRef };
}
