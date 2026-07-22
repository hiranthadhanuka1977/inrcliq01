"use client";

import { useEffect, useRef } from "react";

const SCROLL_THRESHOLD = 2;

export function useStoriesCarousel() {
  const storiesRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const stories = storiesRef.current;
    const track = trackRef.current;
    const prevBtn = prevRef.current;
    const nextBtn = nextRef.current;
    if (!stories || !track || !prevBtn || !nextBtn) return;

    const update = () => {
      const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
      const canPrev = track.scrollLeft > SCROLL_THRESHOLD;
      const canNext = track.scrollLeft < maxScroll - SCROLL_THRESHOLD;

      prevBtn.classList.toggle("is-visible", canPrev);
      nextBtn.classList.toggle("is-visible", canNext);
      stories.classList.toggle("has-prev", canPrev);
      stories.classList.toggle("has-next", canNext);
      prevBtn.disabled = !canPrev;
      nextBtn.disabled = !canNext;
    };

    const scrollByPage = (direction: -1 | 1) => {
      track.scrollBy({ left: direction * track.clientWidth, behavior: "smooth" });
    };

    const onPrev = () => scrollByPage(-1);
    const onNext = () => scrollByPage(1);

    prevBtn.addEventListener("click", onPrev);
    nextBtn.addEventListener("click", onNext);
    track.addEventListener("scroll", update, { passive: true });

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(track);

    update();
    const layoutTimer = window.setTimeout(update, 150);

    return () => {
      window.clearTimeout(layoutTimer);
      prevBtn.removeEventListener("click", onPrev);
      nextBtn.removeEventListener("click", onNext);
      track.removeEventListener("scroll", update);
      resizeObserver.disconnect();
    };
  }, []);

  return { storiesRef, trackRef, prevRef, nextRef };
}
