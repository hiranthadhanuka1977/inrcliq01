(function () {
  function ensureFilterIndicator(track) {
    let indicator = track.querySelector(".feed-filters__indicator");
    if (!indicator) {
      indicator = document.createElement("span");
      indicator.className = "feed-filters__indicator";
      indicator.setAttribute("aria-hidden", "true");
    }
    return indicator;
  }

  function normalizeFilter(filter) {
    if (typeof filter === "string") {
      return { label: filter, icon: null };
    }

    return {
      label: filter.label,
      icon: filter.icon || null,
    };
  }

  function getFilterLabel(filter) {
    return normalizeFilter(filter).label;
  }

  function updateFilterIndicator(track, instant) {
    const indicator = ensureFilterIndicator(track);
    const activeItem = track.querySelector(".feed-filter-item.is-active");
    const isUnderline = track.classList.contains("feed-filters__track--audio");

    if (!activeItem) {
      indicator.classList.remove("is-visible");
      return;
    }

    const left = activeItem.offsetLeft - track.scrollLeft;
    const top = activeItem.offsetTop;

    if (instant) {
      indicator.style.transition = "none";
    }

    indicator.style.width = `${activeItem.offsetWidth}px`;

    if (isUnderline) {
      indicator.style.height = "2px";
      indicator.style.top = "auto";
      indicator.style.bottom = "0";
      indicator.style.transform = `translate(${left}px, 0)`;
    } else {
      indicator.style.height = `${activeItem.offsetHeight}px`;
      indicator.style.top = "";
      indicator.style.bottom = "";
      indicator.style.transform = `translate(${left}px, ${top}px)`;
    }

    indicator.classList.add("is-visible");

    if (instant) {
      indicator.offsetHeight;
      indicator.style.transition = "";
    }
  }

  function scheduleIndicatorUpdate(track, instant) {
    requestAnimationFrame(() => updateFilterIndicator(track, instant));

    if (!instant) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => updateFilterIndicator(track, false));
      });
    }
  }

  function bindFilterTrack(track) {
    if (track.dataset.filtersBound === "true") return;
    track.dataset.filtersBound = "true";

    track.addEventListener("scroll", () => updateFilterIndicator(track), { passive: true });
    window.addEventListener("resize", () => updateFilterIndicator(track));
  }

  function renderFeedFilters(track, filters, defaultFilter, activeFilter) {
    const indicator = ensureFilterIndicator(track);
    track.replaceChildren();
    track.appendChild(indicator);

    filters.forEach((filterEntry) => {
      const { label, icon } = normalizeFilter(filterEntry);
      const item = document.createElement("div");
      item.className = "feed-filter-item";
      item.dataset.filter = label;

      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "feed-filter";
      chip.setAttribute("role", "tab");

      if (icon) {
        chip.innerHTML = `<span class="feed-filter__icon" aria-hidden="true">${icon}</span><span class="feed-filter__label">${label}</span>`;
      } else {
        chip.textContent = label;
      }

      chip.addEventListener("click", () => setActiveFilter(track, filters, defaultFilter, label));

      item.append(chip);
      track.appendChild(item);
    });

    bindFilterTrack(track);
    setActiveFilter(track, filters, defaultFilter, activeFilter, true);
  }

  function setActiveFilter(track, filters, defaultFilter, activeFilter, isInit) {
    track.querySelectorAll(".feed-filter-item").forEach((item) => {
      const label = item.dataset.filter;
      const isActive = label === activeFilter;
      const chip = item.querySelector(".feed-filter");

      item.classList.toggle("is-active", isActive);
      chip.classList.toggle("is-active", isActive);
      chip.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    scheduleIndicatorUpdate(track, isInit);

    if (!isInit) {
      const activeItem = track.querySelector(`.feed-filter-item[data-filter="${activeFilter}"]`);
      requestAnimationFrame(() => {
        activeItem?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
      });
    }
  }

  function initFeedFilters(tracks, filters, defaultFilter) {
    tracks.forEach((track) => {
      renderFeedFilters(track, filters, defaultFilter, defaultFilter);
      bindCollapsibleFilters(track);
    });
  }

  function bindCollapsibleFilters(track) {
    const section = track.closest(".feed-filters--collapsible");
    if (!section || section.dataset.collapsibleBound === "true") return;

    section.dataset.collapsibleBound = "true";

    const toggle = section.querySelector(".feed-filters__toggle");
    if (!toggle) return;

    const setExpanded = (expanded) => {
      section.classList.toggle("is-expanded", expanded);
      toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
      toggle.setAttribute("aria-label", expanded ? "Hide category filters" : "Show category filters");
    };

    toggle.addEventListener("click", () => {
      setExpanded(!section.classList.contains("is-expanded"));
    });

    const syncActiveDot = () => {
      const activeItem = track.querySelector(".feed-filter-item.is-active");
      const isFiltered = activeItem && activeItem.dataset.filter !== "All";
      toggle.classList.toggle("has-active-filter", Boolean(isFiltered));
    };

    track.addEventListener("click", (event) => {
      if (event.target.closest(".feed-filter")) {
        requestAnimationFrame(syncActiveDot);
      }
    });

    syncActiveDot();
  }

  window.FeedFilters = {
    render: renderFeedFilters,
    init: initFeedFilters,
    setActive: setActiveFilter,
    updateIndicator: updateFilterIndicator,
  };
})();
