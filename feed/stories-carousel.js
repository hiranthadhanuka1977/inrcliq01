(function () {
  const SCROLL_THRESHOLD = 2;

  function bindStoriesCarousel(root) {
    const stories = root.querySelector(".stories");
    const track = root.querySelector(".stories-track");
    const prevBtn = root.querySelector(".story-nav--prev");
    const nextBtn = root.querySelector(".story-nav--next");
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

    const scrollByPage = (direction) => {
      track.scrollBy({ left: direction * track.clientWidth, behavior: "smooth" });
    };

    prevBtn.addEventListener("click", () => scrollByPage(-1));
    nextBtn.addEventListener("click", () => scrollByPage(1));
    track.addEventListener("scroll", update, { passive: true });

    if (typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver(update);
      resizeObserver.observe(track);
    }

    update();
    window.setTimeout(update, 150);
  }

  window.StoriesCarousel = { bind: bindStoriesCarousel };
})();
