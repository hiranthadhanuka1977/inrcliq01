"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FeedItem } from "@/types/feed/feed";

const FILTER_LOAD_MS = 650;

export function useFeedFilter(items: FeedItem[]) {
  const [activeCategory, setActiveCategoryState] = useState<string | null>(null);
  const [appliedCategory, setAppliedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const loadIdRef = useRef(0);
  const previousCategoryRef = useRef<string | null>(null);

  const setActiveCategory = useCallback((category: string | null) => {
    setActiveCategoryState(category);
  }, []);

  useEffect(() => {
    if (previousCategoryRef.current === activeCategory) return;

    previousCategoryRef.current = activeCategory;
    const loadId = ++loadIdRef.current;
    setIsLoading(true);

    const timer = window.setTimeout(() => {
      if (loadIdRef.current !== loadId) return;
      setAppliedCategory(activeCategory);
      setIsLoading(false);
    }, FILTER_LOAD_MS);

    return () => window.clearTimeout(timer);
  }, [activeCategory]);

  const filteredItems = useMemo(() => {
    if (!appliedCategory) return items;
    return items.filter((item) => item.category === appliedCategory);
  }, [appliedCategory, items]);

  return { activeCategory, setActiveCategory, filteredItems, isLoading };
}
