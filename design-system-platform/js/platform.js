(function () {
  var toggle = document.getElementById("theme-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var html = document.documentElement;
      var current = html.getAttribute("data-feed-theme");
      var next = current === "dark" ? "light" : "dark";
      html.setAttribute("data-feed-theme", next);
      toggle.textContent = next === "dark" ? "Toggle Light Mode" : "Toggle Dark Mode";
    });
  }

  var sections = document.querySelectorAll(".ds-section[id]");
  var navLinks = document.querySelectorAll('.ds-nav__link[href^="#"]');
  if (sections.length && navLinks.length && "IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            navLinks.forEach(function (link) {
              link.classList.remove("is-active");
            });
            var active = document.querySelector('.ds-nav__link[href="#' + entry.target.id + '"]');
            if (active) active.classList.add("is-active");
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  var copyIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
  var checkIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"></path></svg>';

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        resolve();
      } catch (e) {
        reject(e);
      } finally {
        document.body.removeChild(ta);
      }
    });
  }

  function setLang(block, lang) {
    block.setAttribute("data-markup-lang", lang);
    block.querySelectorAll(".ds-markup__lang").forEach(function (btn) {
      var on = btn.getAttribute("data-lang") === lang;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    block.querySelectorAll(".ds-markup__code").forEach(function (pre) {
      if (pre.getAttribute("data-lang") === lang) pre.removeAttribute("hidden");
      else pre.setAttribute("hidden", "");
    });
  }

  document.querySelectorAll(".ds-markup").forEach(function (block) {
    block.querySelectorAll(".ds-markup__lang").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setLang(block, btn.getAttribute("data-lang") || "html");
      });
    });
    var copyBtn = block.querySelector(".ds-markup__copy");
    if (!copyBtn) return;
    var timer = null;
    copyBtn.addEventListener("click", function () {
      var lang = block.getAttribute("data-markup-lang") || "html";
      var code = block.querySelector('.ds-markup__code[data-lang="' + lang + '"] code');
      if (!code) return;
      copyText(code.textContent || "").then(function () {
        copyBtn.classList.add("is-copied");
        copyBtn.setAttribute("aria-label", "Copied");
        copyBtn.setAttribute("title", "Copied");
        copyBtn.innerHTML = checkIcon;
        if (timer) clearTimeout(timer);
        timer = setTimeout(function () {
          copyBtn.classList.remove("is-copied");
          copyBtn.setAttribute("aria-label", "Copy markup");
          copyBtn.setAttribute("title", "Copy markup");
          copyBtn.innerHTML = copyIcon;
        }, 1600);
      });
    });
  });

  document.querySelectorAll(".follow-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      btn.classList.toggle("is-following");
      btn.textContent = btn.classList.contains("is-following") ? "Following" : "Follow";
    });
  });
})();
