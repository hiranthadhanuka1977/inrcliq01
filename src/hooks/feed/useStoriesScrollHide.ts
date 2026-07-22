"use client";

import { useEffect, type RefObject } from "react";

const TOP_THRESHOLD = 24;
const SCROLL_DOWN_MIN = 14;
const HIDE_AFTER_Y = 56;
const COOLDOWN_MS = 320;

export function useStoriesScrollHide(headerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const storiesBar = header.querySelector(".stories-bar");
    if (!storiesBar) return;

    let lastScrollY = window.scrollY;
    let isCollapsed = false;
    let ticking = false;
    let lockUntil = 0;

    const setCollapsed = (next: boolean) => {
      if (next === isCollapsed) return;
      isCollapsed = next;
      header.classList.toggle("is-stories-collapsed", next);
      storiesBar.setAttribute("aria-hidden", next ? "true" : "false");
      lockUntil = performance.now() + COOLDOWN_MS;
    };

    const onScrollFrame = () => {
      const now = performance.now();
      if (now < lockUntil) {
        ticking = false;
        return;
      }

      const currentY = window.scrollY;
      const delta = currentY - lastScrollY;

      if (currentY <= TOP_THRESHOLD) {
        setCollapsed(false);
      } else if (!isCollapsed && delta > SCROLL_DOWN_MIN && currentY > HIDE_AFTER_Y) {
        setCollapsed(true);
      }

      lastScrollY = currentY;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(onScrollFrame);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      header.classList.remove("is-stories-collapsed");
      storiesBar.setAttribute("aria-hidden", "false");
    };
  }, [headerRef]);
}
