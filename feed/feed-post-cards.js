(function initFbPostCards() {
  const isProfilePage = document.body.classList.contains("page-profile");
  const globeSvg =
    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0ZM1.5 8a6.5 6.5 0 0 1 11.3-4.5 8.4 8.4 0 0 0-2.1 1.4 5.5 5.5 0 0 0-4.4 2.1A5.5 5.5 0 0 0 3.6 9 6.4 6.4 0 0 0 1.5 8Zm13 0a6.4 6.4 0 0 0-2.1-1.5 5.5 5.5 0 0 0 .3 1.6 5.5 5.5 0 0 0-1.2 3.6A6.5 6.5 0 0 1 14.5 8ZM8 14.5a6.4 6.4 0 0 0 2.1-1.5 5.5 5.5 0 0 0-4.2-2.1 5.5 5.5 0 0 0-1.2-3.6A6.5 6.5 0 0 1 8 14.5Z"/></svg>';
  const verifiedBadgeHtml =
    '<span class="post-head__badge"><svg class="post-head__badge-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 7.1-1.01L12 2z"/></svg>Verified</span>';
  const verifiedCreators = new Set([
    "Taylor Swift",
    "Bruno Mars",
    "Dua Lipa",
    "Billie Eilish",
    "Ariana Grande",
    "Drake",
    "Adele",
  ]);

  const creatorHandles = {
    "Taylor Swift": "taylorswiftmusic",
    "Bruno Mars": "brunomars",
    "Dua Lipa": "dualipa",
    "Billie Eilish": "billieeilish",
    "Miley Cyrus": "mileycyrus",
    "Ariana Grande": "arianagrande",
    "Ed Sheeran": "edsheeran",
    Drake: "drake",
    "Olivia Rodrigo": "oliviarodrigo",
    Adele: "adele",
    "The Weeknd": "theweeknd",
    "Post Malone": "postmalone",
    SZA: "sza",
    "Doja Cat": "dojacat",
    "Jennifer Lopez": "jlo",
  };

  function getCreatorHandle(name) {
    if (!name) return "";
    if (creatorHandles[name]) return creatorHandles[name];
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  function createMetaDot() {
    const dot = document.createElement("span");
    dot.className = "post-head__meta-dot";
    dot.textContent = "·";
    dot.setAttribute("aria-hidden", "true");
    return dot;
  }

  function ensureCreatorHandle(identity) {
    if (!identity || identity.querySelector(".post-head__handle")) return;

    const name = identity.querySelector(".post-head__name")?.textContent?.trim();
    const metaLine = identity.querySelector(".post-head__meta-line");
    if (!name || !metaLine) return;

    const handle = document.createElement("span");
    handle.className = "post-head__handle";
    handle.textContent = `@${getCreatorHandle(name)}`;
    metaLine.insertBefore(handle, metaLine.firstChild);
    metaLine.insertBefore(createMetaDot(), handle.nextSibling);
  }

  const moreIconSvg =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.75"/><circle cx="12" cy="12" r="1.75"/><circle cx="19" cy="12" r="1.75"/></svg>';
  const closeIconSvg =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

  function ensureToolIcons(tools) {
    if (!tools) return;

    const more = tools.querySelector(".more");
    if (more && !more.querySelector("svg")) {
      more.innerHTML = moreIconSvg;
    }

    const close = tools.querySelector(".post-head__close");
    if (close && !close.querySelector("svg")) {
      close.innerHTML = closeIconSvg;
    }
  }

  function ensureVerifiedBadge(identity) {
    const name = identity.querySelector(".post-head__name");
    const creatorName = name?.textContent?.trim();
    if (!name || !creatorName || !verifiedCreators.has(creatorName)) return;
    if (identity.querySelector(".post-head__badge")) return;
    name.insertAdjacentHTML("afterend", verifiedBadgeHtml);
  }

  function ensurePostHeadTools(post) {
    const head = post.querySelector(".post-head");
    if (!head || head.querySelector(".post-head__tools")) return;

    const more = head.querySelector(":scope > .more");
    if (!more) return;

    const tools = document.createElement("div");
    tools.className = "post-head__tools";
    head.insertBefore(tools, more);
    tools.appendChild(more);
  }

  function applyRandomFollowState(post) {
    const author = post.querySelector(".post-head__author");
    const identity = author?.querySelector(".post-head__identity");
    const tools = post.querySelector(".post-head__tools");
    if (!author || !identity || author.dataset.followReady === "true") return;

    author.querySelector(".post-head__follow")?.remove();
    author.querySelector(".post-head__following")?.remove();
    identity.querySelector(".post-head__follow")?.remove();
    identity.querySelector(".post-head__following")?.remove();
    tools?.querySelector(".post-head__follow")?.remove();
    tools?.querySelector(".post-head__following")?.remove();

    const nameRow = identity.querySelector(".post-head__name-row") || identity;
    const badge = nameRow.querySelector(".post-head__badge");
    const name = nameRow.querySelector(".post-head__name");
    const anchor = badge || name;
    if (!anchor) return;

    const isFollowing = Math.random() < 0.5;

    if (isFollowing) {
      const label = document.createElement("span");
      label.className = "post-head__following";
      label.textContent = "Following";
      anchor.insertAdjacentElement("afterend", label);
    } else {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "post-head__follow";
      btn.textContent = "Follow";
      anchor.insertAdjacentElement("afterend", btn);
    }

    author.dataset.followReady = "true";
  }

  document.querySelectorAll(".feed-surface--simple .post--simple").forEach((post) => {
    const identity = post.querySelector(".post-head__identity");
    if (identity) ensureVerifiedBadge(identity);

    if (identity && !identity.querySelector(".post-head__meta-line")) {
      const name = identity.querySelector(".post-head__name");
      const badge = identity.querySelector(".post-head__badge");
      const time =
        identity.querySelector(".post-head__time") ||
        identity.querySelector(".post-head__meta .post-head__time");
      const nameRow = document.createElement("div");
      nameRow.className = "post-head__name-row";
      if (name) nameRow.appendChild(name);
      if (badge) nameRow.appendChild(badge);

      const metaLine = document.createElement("div");
      metaLine.className = "post-head__meta-line";
      const handle = document.createElement("span");
      handle.className = "post-head__handle";
      handle.textContent = `@${getCreatorHandle(name?.textContent?.trim())}`;
      metaLine.appendChild(handle);
      metaLine.appendChild(createMetaDot());
      if (time) metaLine.appendChild(time);
      metaLine.appendChild(createMetaDot());
      const globe = document.createElement("span");
      globe.className = "post-head__globe";
      globe.innerHTML = globeSvg;
      metaLine.appendChild(globe);

      identity.textContent = "";
      identity.appendChild(nameRow);
      identity.appendChild(metaLine);
    }

    if (identity) ensureCreatorHandle(identity);

    ensurePostHeadTools(post);

    const tools = post.querySelector(".post-head__tools");
    if (tools && !tools.querySelector(".post-head__close")) {
      const close = document.createElement("button");
      close.type = "button";
      close.className = "post-head__close";
      close.setAttribute("aria-label", "Hide post");
      close.innerHTML = closeIconSvg;
      tools.appendChild(close);
    }

    ensureToolIcons(tools);

    if (!isProfilePage) {
      applyRandomFollowState(post);
    }

    const footer = post.querySelector(".post-footer");
    const actions = footer?.querySelector(".post-actions");
    if (footer && actions && actions.dataset.engageReady !== "true") {
      const likeCount = actions.querySelector(".post-action:nth-child(1) span")?.textContent?.trim() || "0";
      const commentCount = actions.querySelector(".post-action:nth-child(2) span")?.textContent?.trim() || "0";

      const likeIcon =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
      const commentIcon =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
      const shareIcon =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98"/><path d="m15.41 6.51-6.82 3.98"/></svg>';

      actions.classList.add("post-actions--engage");
      actions.dataset.engageReady = "true";
      actions.innerHTML = `
        <button type="button" class="post-action post-action--like" aria-label="Like">
          ${likeIcon}
          <span class="post-action__count">${likeCount}</span>
        </button>
        <button type="button" class="post-action post-action--comment" aria-label="Comment">
          ${commentIcon}
          <span class="post-action__count">${commentCount}</span>
        </button>
        <button type="button" class="post-action post-action--share" aria-label="Share">
          ${shareIcon}
        </button>
      `;
    }
  });

  document.querySelectorAll(".feed-surface--simple .post-head__follow").forEach((btn) => {
    btn.addEventListener("click", () => {
      const following = btn.classList.toggle("is-following");
      btn.textContent = following ? "Following" : "Follow";
    });
  });
})();
