(function () {
  const root = document.documentElement;

  function themeIcon(isDark) {
    return isDark
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path stroke-linecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 0 0 11.5 11.5z"/></svg>';
  }

  function applyTheme(theme) {
    root.setAttribute("data-feed-theme", theme);
    const isDark = theme === "dark";
    document.querySelectorAll(".theme-switcher").forEach((btn) => {
      btn.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
      btn.setAttribute("title", isDark ? "Light mode" : "Dark mode");
      btn.innerHTML = themeIcon(isDark);
    });
  }

  function initThemeSwitchers() {
    const saved = localStorage.getItem("inrcliq-ds-theme");
    if (saved === "light" || saved === "dark") applyTheme(saved);

    document.querySelectorAll(".theme-switcher").forEach((btn) => {
      btn.addEventListener("click", () => {
        const next = root.getAttribute("data-feed-theme") === "light" ? "dark" : "light";
        applyTheme(next);
        localStorage.setItem("inrcliq-ds-theme", next);
      });
    });
  }

  function initDisclosures() {
    document.querySelectorAll(".disclosure__trigger").forEach((trigger) => {
      trigger.addEventListener("click", () => {
        const disclosure = trigger.closest(".disclosure");
        if (!disclosure) return;
        const open = disclosure.classList.toggle("is-open");
        trigger.setAttribute("aria-expanded", String(open));
      });
    });
  }

  function initPasswordToggle(btnId, inputId) {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;

    const showIcon = btn.querySelector(".password-toggle__icon--show");
    const hideIcon = btn.querySelector(".password-toggle__icon--hide");

    btn.addEventListener("click", () => {
      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      btn.setAttribute("aria-pressed", String(!visible));
      btn.setAttribute("aria-label", visible ? "Show password" : "Hide password");
      showIcon?.classList.toggle("hidden", !visible);
      hideIcon?.classList.toggle("hidden", visible);
    });
  }

  function initChips() {
    document.querySelectorAll(".chips-row .chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const selected = chip.classList.toggle("is-selected");
        chip.setAttribute("aria-pressed", String(selected));
      });
    });
  }

  function initProtectionTiers() {
    document.querySelectorAll(".protection-tier").forEach((tier) => {
      tier.addEventListener("click", () => {
        document.querySelectorAll(".protection-tier").forEach((el) => {
          el.classList.remove("is-selected");
          el.setAttribute("aria-checked", "false");
        });
        tier.classList.add("is-selected");
        tier.setAttribute("aria-checked", "true");
      });
    });
  }

  function initTopLogoScroll() {
    const logo = document.querySelector(".auth-top-logo");
    const scroller = document.querySelector(".auth-center--signup-step") || document.querySelector(".page-centered");
    if (!logo || !scroller) return;

    function update() {
      const scrolled = scroller.scrollTop > 12 || window.scrollY > 12;
      logo.classList.toggle("is-hidden", scrolled);
      logo.setAttribute("aria-hidden", String(scrolled));
      logo.tabIndex = scrolled ? -1 : 0;
    }

    scroller.addEventListener("scroll", update, { passive: true });
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  initThemeSwitchers();
  initDisclosures();
  initPasswordToggle("btn-signup-password-toggle", "signup-password");
  initPasswordToggle("btn-login-password-toggle", "login-password");
  initPasswordToggle("btn-par-parent-password-toggle", "par-parent-password");
  initChips();
  initProtectionTiers();
  initTopLogoScroll();
})();
