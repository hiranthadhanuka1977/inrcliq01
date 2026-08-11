# -*- coding: utf-8 -*-
"""Write a complete home feed sample page."""
from pathlib import Path

OUT = Path(__file__).resolve().parent / "pages" / "feed" / "home.html"

ICONS = {
    "home": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z"/></svg>',
    "messages": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    "snaps": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="m10 8 6 4-6 4V8z" fill="currentColor" stroke="none"/></svg>',
    "photos": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    "videos": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/></svg>',
    "audio": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    "explore": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
    "purchases": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
    "bookings": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    "more": '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.75"/><circle cx="12" cy="12" r="1.75"/><circle cx="19" cy="12" r="1.75"/></svg>',
    "sun": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path stroke-linecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
    "heart": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    "comment": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    "share": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
    "save": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
    "verified": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 7.1-1.01L12 2z"/></svg>',
    "play": '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="23" fill="#fff" stroke="#fff" stroke-width="2"/><path d="M19 15.5v17l14-8.5-14-8.5z" fill="#111"/></svg>',
    "plus": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    "filter": '<svg viewBox="0 0 24 24" aria-hidden="true" class="feed-filters__toggle-icon"><path d="M4 7h16M7 12h10M10 17h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="7" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="17" r="2" fill="currentColor"/></svg>',
    "notify": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    "chart": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 16l4-5 4 3 5-7"/></svg>',
    "up": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>',
    "chev-l": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    "chev-r": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
}


def nav_item(label, icon, active=False, badge=None, home=False):
    cls = "nav-item active" if active else "nav-item"
    icon_cls = "nav-icon nav-icon--home" if home else "nav-icon"
    badge_html = f'<span class="badge">{badge}</span>' if badge else ""
    current = ' aria-current="page"' if active else ""
    return f'''<a class="{cls}" href="#"{current}>
                  <span class="nav-item__label">
                    <span class="{icon_cls}" aria-hidden="true">{ICONS[icon]}</span>
                    <span class="nav-item__text">{label}{badge_html}</span>
                  </span>
                </a>'''


def story(name, color, initials=None, image=None, ring="gradient", offline=False, snap=False):
    if snap:
        return f'''<a class="story story--snap" href="#">
              <div class="story-avatar-ring story-avatar-ring--muted">
                <div class="story-avatar story-avatar--snap" aria-hidden="true">{ICONS["plus"]}</div>
              </div>
              <span>Your Snap</span>
            </a>'''
    off = " story-avatar--offline" if offline else ""
    inner = f'<img src="{image}" alt="{name}" />' if image else initials
    return f'''<a class="story" href="#">
              <div class="story-avatar-ring story-avatar-ring--{ring}">
                <div class="story-avatar{off}" style="--story-color:{color}">{inner}</div>
              </div>
              <span>{name}</span>
            </a>'''


def post_actions(likes, comments):
    return f'''<div class="post-footer">
          <div class="post-actions post-actions--engage" role="group" aria-label="Post actions">
            <button type="button" class="post-action post-action--like" aria-label="Like">{ICONS["heart"]}<span class="post-action__count">{likes}</span></button>
            <button type="button" class="post-action post-action--comment" aria-label="Comment">{ICONS["comment"]}<span class="post-action__count">{comments}</span></button>
            <button type="button" class="post-action post-action--share" aria-label="Share">{ICONS["share"]}</button>
            <button type="button" class="post-action post-action--save" aria-label="Bookmark">{ICONS["save"]}</button>
          </div>
        </div>'''


def post_head(name, handle, time, color, avatar_img=None, initials=None, following=False, verified=False):
    av = f'<img src="{avatar_img}" alt="" />' if avatar_img else (initials or "?")
    follow_cls = "follow-btn post-head__follow is-following" if following else "follow-btn post-head__follow"
    follow_label = "Following" if following else "Follow"
    ver = f'<span class="post-head__badge"><span class="post-head__badge-icon">{ICONS["verified"]}</span> Verified</span>' if verified else ""
    return f'''<div class="post-head">
          <div class="post-head__author">
            <div class="post-head__avatar" style="--story-color:{color}" aria-hidden="true">{av}</div>
            <div class="post-head__identity">
              <div class="post-head__name-row">
                <strong class="post-head__name">{name}</strong>
                {ver}
                <button type="button" class="{follow_cls}">{follow_label}</button>
              </div>
              <div class="post-head__meta-line">
                <span class="post-head__handle">{handle}</span>
                <span class="post-head__meta-dot" aria-hidden="true">·</span>
                <time class="post-head__time">{time}</time>
              </div>
            </div>
          </div>
          <div class="post-head__tools">
            <button type="button" class="more" aria-label="More options">{ICONS["more"]}</button>
          </div>
        </div>'''


PLAY = f'<div class="post-media__play" aria-hidden="true"><span>{ICONS["play"]}</span></div>'

html = f'''<!DOCTYPE html>
<html lang="en" data-feed-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Home feed — Platform DS</title>
  <link rel="stylesheet" href="../../css/main.css" />
  <style>
    .ds-sample-back {{
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 60;
    }}
    @media (max-width: 1100px) {{
      .ds-sample-back {{ top: auto; bottom: calc(4.5rem + env(safe-area-inset-bottom, 0px)); }}
    }}
  </style>
</head>
<body class="page-home">
  <a href="../../index.html" class="btn btn--secondary btn--sm ds-sample-back">← Design system</a>

  <div class="feed-path-shell">
    <div class="app-shell page-home">
      <!-- Left nav -->
      <aside class="left-nav">
        <div class="left-nav__body">
          <div class="left-nav__header">
            <div class="brand">
              <a href="../../index.html" style="color:inherit;text-decoration:none">INRCLIQ<span class="dot">.</span></a>
            </div>
            <div class="left-nav__header-actions">
              <button type="button" class="theme-switcher" id="theme-toggle" aria-label="Switch to light theme" title="Light mode">
                {ICONS["sun"]}
              </button>
              <a class="nav-notify" href="#" aria-label="Notifications">
                {ICONS["notify"]}
                <span class="nav-notify__dot" aria-hidden="true"></span>
              </a>
            </div>
          </div>
          <nav>
            {nav_item("Home", "home", active=True, home=True)}
            {nav_item("Messages", "messages", badge="3")}
            <hr class="nav-separator" />
            {nav_item("Snaps", "snaps")}
            {nav_item("Photos", "photos")}
            {nav_item("Videos", "videos")}
            {nav_item("Audio", "audio")}
            <hr class="nav-separator" />
            {nav_item("Explore", "explore")}
            {nav_item("Purchases", "purchases")}
            {nav_item("Bookings", "bookings")}
          </nav>
        </div>

        <div class="nav-promo">
          <div class="nav-promo__card" role="region" aria-label="Creator tools">
            <div class="nav-promo__icon" aria-hidden="true">{ICONS["chart"]}</div>
            <h3 class="nav-promo__title">Go Premium</h3>
            <p class="nav-promo__text">Turn your followers into paying subscribers today.</p>
            <button type="button" class="btn btn--outline-brand btn--sm btn--block nav-promo__btn">Unlock Premium Tools</button>
          </div>
        </div>

        <div class="nav-create">
          <button type="button" class="nav-create__btn">{ICONS["plus"]} Create</button>
        </div>

        <div class="nav-profile">
          <a href="#" class="nav-profile__link">
            <span class="nav-profile__avatar" style="--story-color:#0d9488" aria-hidden="true">H</span>
            <span class="nav-profile__info">
              <span class="nav-profile__name">Hiran</span>
              <span class="nav-profile__meta">View network</span>
            </span>
          </a>
          <div class="nav-profile__menu-wrap">
            <button type="button" class="nav-profile__menu" aria-label="Account menu">{ICONS["more"]}</button>
          </div>
        </div>
      </aside>

      <div class="main-content">
        <!-- Stories -->
        <div class="feed-header" id="feed-top">
          <section class="stories-bar" aria-label="Stories">
            <div class="stories">
              <div class="stories-track" id="stories-track">
                {story("", "", snap=True)}
                {story("Taylor", "#4f46e5", image="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=120&q=80&auto=format&fit=crop")}
                {story("Jennifer", "#8b5cf6", initials="JL", ring="muted", offline=True)}
                {story("Bruno", "#a21caf", image="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=120&q=80&auto=format&fit=crop")}
                {story("Dua", "#c026d3", image="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=120&q=80&auto=format&fit=crop", offline=True)}
                {story("Billie", "#0f766e", initials="BE", ring="muted", offline=True)}
                {story("Olivia", "#6d28d9", initials="OR")}
                {story("Ariana", "#f97316", image="https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=120&q=80&auto=format&fit=crop")}
                {story("Ed S.", "#166534", initials="ED", ring="muted")}
                {story("SZA", "#be185d", initials="SZ", ring="muted")}
              </div>
              <button class="story-nav story-nav--prev" type="button" aria-label="Previous stories" disabled>{ICONS["chev-l"]}</button>
              <button class="story-nav story-nav--next" type="button" aria-label="Next stories">{ICONS["chev-r"]}</button>
            </div>
          </section>
        </div>

        <div class="content-layout">
          <div class="content-row">
            <main class="feed-main feed-surface feed-surface--simple">
              <!-- Greeting + filters -->
              <section class="feed-filters feed-filters--audio feed-filters--collapsible feed-filters--in-feed feed-landing is-expanded" aria-label="Feed categories" id="feed-filters">
                <div class="feed-landing__header">
                  <section class="spotify-landing" aria-label="Quick access">
                    <div class="spotify-landing__intro">
                      <div class="spotify-landing__greeting-row">
                        <a href="#" class="spotify-landing__avatar spotify-landing__avatar--live" style="--story-color:#0d9488" aria-label="View your profile">HI</a>
                        <h1 class="spotify-landing__greeting">Good morning, Hiran</h1>
                      </div>
                    </div>
                  </section>
                  <button type="button" class="feed-filters__toggle" id="filter-toggle" aria-expanded="true" aria-controls="home-feed-filter-pills" aria-label="Hide category filters">
                    {ICONS["filter"]}
                  </button>
                </div>
                <div class="feed-filters__pills-wrap" id="home-feed-filter-pills">
                  <div class="feed-filters__pills-inner">
                    <div class="feed-filters__track feed-filters__track--audio" role="tablist">
                      <span class="feed-filter-item is-active" data-filter="All"><button type="button" role="tab" aria-selected="true" class="feed-filter">All</button></span>
                      <span class="feed-filter-item" data-filter="music"><button type="button" role="tab" aria-selected="false" class="feed-filter">Music</button></span>
                      <span class="feed-filter-item" data-filter="discovery"><button type="button" role="tab" aria-selected="false" class="feed-filter">Discovery</button></span>
                      <span class="feed-filter-item" data-filter="comedy"><button type="button" role="tab" aria-selected="false" class="feed-filter">Comedy</button></span>
                      <span class="feed-filter-item" data-filter="sports"><button type="button" role="tab" aria-selected="false" class="feed-filter">Sports</button></span>
                      <span class="feed-filter-item" data-filter="fashion"><button type="button" role="tab" aria-selected="false" class="feed-filter">Fashion</button></span>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Post 1 -->
              <article class="post post--simple">
                {post_head("Bathiya &amp; Santhush", "@bathiya", "2h", "#1241a6", avatar_img="../../assets/creators/avatar.jpg", verified=True)}
                <div class="post__body">
                  <div class="post-tags"><span class="tag">Music</span><span class="tag">Live</span></div>
                  <p>New stage moments from the weekend show. Which song should we open with next?</p>
                  <div class="post-media">
                    <img src="../../assets/creators/feed.jpg" alt="Live performance" />
                    {PLAY}
                  </div>
                </div>
                {post_actions("12.4K", "864")}
              </article>

              <!-- Top creators (injected after first post) -->
              <section class="audio-top-creators" aria-label="Top creators">
                <div class="rail-title">
                  <h3>Top Creators</h3>
                  <span class="audio-section__subtitle">Artists, hosts, and narrators rising this week</span>
                </div>
                <div class="audio-top-creators__row">
                  <article class="audio-top-creator-card">
                    <a href="#" class="audio-top-creator-card__hit" aria-label="View Billie Eilish">
                      <span class="audio-top-creator-card__art"><img src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=240&amp;q=80&amp;auto=format&amp;fit=crop" alt="" /></span>
                      <span class="audio-top-creator-card__body">
                        <strong class="audio-top-creator-card__name">Billie Eilish <span class="audio-top-creator-card__verified" aria-label="Verified">{ICONS["verified"]}</span></strong>
                        <span class="audio-top-creator-card__handle">@billieeilish</span>
                        <span class="audio-top-creator-card__meta">Music · 12.4M monthly</span>
                      </span>
                    </a>
                    <button type="button" class="follow-btn audio-top-creator-card__follow">Follow</button>
                  </article>
                  <article class="audio-top-creator-card">
                    <a href="#" class="audio-top-creator-card__hit" aria-label="View Hard Fork">
                      <span class="audio-top-creator-card__art"><img src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=240&amp;q=80&amp;auto=format&amp;fit=crop" alt="" /></span>
                      <span class="audio-top-creator-card__body">
                        <strong class="audio-top-creator-card__name">Hard Fork <span class="audio-top-creator-card__verified" aria-label="Verified">{ICONS["verified"]}</span></strong>
                        <span class="audio-top-creator-card__handle">@hardfork</span>
                        <span class="audio-top-creator-card__meta">Podcast · 2.1M monthly</span>
                      </span>
                    </a>
                    <button type="button" class="follow-btn audio-top-creator-card__follow is-following">Following</button>
                  </article>
                  <article class="audio-top-creator-card">
                    <a href="#" class="audio-top-creator-card__hit" aria-label="View James Clear">
                      <span class="audio-top-creator-card__art"><img src="https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=240&amp;q=80&amp;auto=format&amp;fit=crop" alt="" /></span>
                      <span class="audio-top-creator-card__body">
                        <strong class="audio-top-creator-card__name">James Clear <span class="audio-top-creator-card__verified" aria-label="Verified">{ICONS["verified"]}</span></strong>
                        <span class="audio-top-creator-card__handle">@jamesclear</span>
                        <span class="audio-top-creator-card__meta">Audiobook · 890K monthly</span>
                      </span>
                    </a>
                    <button type="button" class="follow-btn audio-top-creator-card__follow">Follow</button>
                  </article>
                  <article class="audio-top-creator-card">
                    <a href="#" class="audio-top-creator-card__hit" aria-label="View Taylor Swift">
                      <span class="audio-top-creator-card__art"><img src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=240&amp;q=80&amp;auto=format&amp;fit=crop" alt="" /></span>
                      <span class="audio-top-creator-card__body">
                        <strong class="audio-top-creator-card__name">Taylor Swift <span class="audio-top-creator-card__verified" aria-label="Verified">{ICONS["verified"]}</span></strong>
                        <span class="audio-top-creator-card__handle">@taylorswift</span>
                        <span class="audio-top-creator-card__meta">Music · 28.6M monthly</span>
                      </span>
                    </a>
                    <button type="button" class="follow-btn audio-top-creator-card__follow">Follow</button>
                  </article>
                </div>
              </section>

              <!-- Post 2 text -->
              <article class="post post--simple">
                {post_head("Mia Chen", "@miachen", "5h", "#db2777", initials="MC", following=True)}
                <div class="post__body">
                  <div class="post-tags"><span class="tag">Discovery</span></div>
                  <p>Just dropped a behind-the-scenes look at how we light outdoor shoots after sunset. Soft gels &gt; harsh LEDs every time.</p>
                </div>
                {post_actions("3.2K", "214")}
              </article>

              <!-- Post 3 collage -->
              <article class="post post--simple">
                {post_head("Nomad Lens", "@nomadlens", "Yesterday", "#0e7490", initials="NL", verified=True)}
                <div class="post__body">
                  <div class="post-tags"><span class="tag">Travel</span><span class="tag">Photos</span></div>
                  <p>Three frames from the coast road — golden hour never misses.</p>
                  <div class="post-media post-media--collage post-media--collage-3">
                    <div class="post-media__cell post-media__cell--main">
                      <img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&amp;q=80&amp;auto=format&amp;fit=crop" alt="" />
                      {PLAY}
                    </div>
                    <div class="post-media__cell">
                      <img src="https://images.unsplash.com/photo-1469474968028-36692f85267a?w=400&amp;q=80&amp;auto=format&amp;fit=crop" alt="" />
                    </div>
                    <div class="post-media__cell">
                      <img src="https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&amp;q=80&amp;auto=format&amp;fit=crop" alt="" />
                    </div>
                  </div>
                </div>
                {post_actions("8.9K", "512")}
              </article>

              <!-- Post 4 -->
              <article class="post post--simple">
                {post_head("Street Beats", "@streetbeats", "2d", "#7c3aed", initials="SB")}
                <div class="post__body">
                  <div class="post-tags"><span class="tag">Music</span><span class="tag">Snaps</span></div>
                  <p>Studio session leftovers. Full track drops Friday.</p>
                  <div class="post-media">
                    <img src="https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=900&amp;q=80&amp;auto=format&amp;fit=crop" alt="Studio session" />
                    {PLAY}
                  </div>
                </div>
                {post_actions("21.1K", "1.4K")}
              </article>

              <!-- Snaps rail -->
              <section class="rail snaps-rail" id="snaps-rail" aria-label="Snaps">
                <div class="rail-title">
                  <h3>Snaps · because you watched Dua Lipa</h3>
                  <a class="rail-title__link" href="#">See all →</a>
                </div>
                <div class="snap-grid">
                  <a class="snap-tile" href="#">
                    <img src="https://images.unsplash.com/photo-1724003450383-4016597e31e3?w=480&amp;h=720&amp;fit=crop&amp;q=85&amp;auto=format" alt="" />
                    <div class="snap-tile__play" aria-hidden="true"><span>{ICONS["play"]}</span></div>
                    <span class="snap-tile__duration">0:41</span>
                    <div class="snap-tile__overlay">
                      <span class="snap-tile__views">4.1M views</span>
                      <span class="snap-tile__creator">
                        <span class="snap-tile__avatar"><img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=120&amp;h=120&amp;fit=crop&amp;q=85&amp;auto=format&amp;crop=faces" alt="" /></span>
                        <span class="snap-tile__handle">@streetbeats · <span class="snap-tile__meta">viral</span></span>
                      </span>
                    </div>
                  </a>
                  <a class="snap-tile" href="#">
                    <img src="https://images.unsplash.com/photo-1622386010273-646e12d1c02f?w=480&amp;h=720&amp;fit=crop&amp;q=85&amp;auto=format" alt="" />
                    <div class="snap-tile__play" aria-hidden="true"><span>{ICONS["play"]}</span></div>
                    <span class="snap-tile__duration">0:36</span>
                    <div class="snap-tile__overlay">
                      <span class="snap-tile__views">2.8M views</span>
                      <span class="snap-tile__creator">
                        <span class="snap-tile__avatar"><img src="https://images.unsplash.com/photo-1539571690953-7b60c5c4c2b6?w=120&amp;h=120&amp;fit=crop&amp;q=85&amp;auto=format&amp;crop=faces" alt="" /></span>
                        <span class="snap-tile__handle">@nomadlens · <span class="snap-tile__meta">viral</span></span>
                      </span>
                    </div>
                  </a>
                  <a class="snap-tile" href="#">
                    <img src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=480&amp;h=720&amp;fit=crop&amp;q=85&amp;auto=format" alt="" />
                    <div class="snap-tile__play" aria-hidden="true"><span>{ICONS["play"]}</span></div>
                    <span class="snap-tile__duration">0:48</span>
                    <div class="snap-tile__overlay">
                      <span class="snap-tile__views">1.9M views</span>
                      <span class="snap-tile__creator">
                        <span class="snap-tile__avatar"><img src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&amp;h=120&amp;fit=crop&amp;q=85&amp;auto=format&amp;crop=faces" alt="" /></span>
                        <span class="snap-tile__handle">@daydream · <span class="snap-tile__meta">music</span></span>
                      </span>
                    </div>
                  </a>
                  <a class="snap-tile" href="#">
                    <img src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=480&amp;h=720&amp;fit=crop&amp;q=85&amp;auto=format" alt="" />
                    <div class="snap-tile__play" aria-hidden="true"><span>{ICONS["play"]}</span></div>
                    <span class="snap-tile__duration">0:29</span>
                    <div class="snap-tile__overlay">
                      <span class="snap-tile__views">6.2M views</span>
                      <span class="snap-tile__creator">
                        <span class="snap-tile__avatar"><img src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&amp;h=120&amp;fit=crop&amp;q=85&amp;auto=format&amp;crop=faces" alt="" /></span>
                        <span class="snap-tile__handle">@billieeilish · <span class="snap-tile__meta">exclusive</span></span>
                      </span>
                    </div>
                  </a>
                </div>
              </section>

              <!-- Post 5 -->
              <article class="post post--simple">
                {post_head("Comedy Central Desk", "@ccd", "3d", "#ca8a04", initials="CC")}
                <div class="post__body">
                  <div class="post-tags"><span class="tag">Comedy</span></div>
                  <p>When the algorithm recommends your own joke back to you… we love it here.</p>
                </div>
                {post_actions("54K", "2.1K")}
              </article>

              <div class="feed-load-sentinel" aria-hidden="true"></div>
            </main>

            <!-- Right rail -->
            <aside class="right-rail">
              <section class="rail-widget">
                <div class="rail-widget__head">
                  <h3>Suggested</h3>
                  <a class="rail-widget__link" href="#">See all</a>
                </div>
                <ul class="suggest-list">
                  <li class="suggest-item">
                    <div class="suggest-item__av" style="--story-color:#8b5cf6" aria-hidden="true">JL</div>
                    <div class="suggest-item__body">
                      <span class="suggest-item__name">Jennifer Lopez</span>
                      <span class="suggest-item__meta">48.2M followers</span>
                    </div>
                    <button type="button" class="follow-btn suggest-item__btn">Follow</button>
                  </li>
                  <li class="suggest-item">
                    <div class="suggest-item__av" style="--story-color:#166534" aria-hidden="true">ED</div>
                    <div class="suggest-item__body">
                      <span class="suggest-item__name">Ed Sheeran</span>
                      <span class="suggest-item__meta">64.1M followers</span>
                    </div>
                    <button type="button" class="follow-btn suggest-item__btn is-following">Following</button>
                  </li>
                  <li class="suggest-item">
                    <div class="suggest-item__av" style="--story-color:#f97316" aria-hidden="true">AG</div>
                    <div class="suggest-item__body">
                      <span class="suggest-item__name">Ariana Grande</span>
                      <span class="suggest-item__meta">89.4M followers</span>
                    </div>
                    <button type="button" class="follow-btn suggest-item__btn">Follow</button>
                  </li>
                </ul>
              </section>

              <section class="rail-widget" id="trending-topics">
                <div class="rail-widget__head">
                  <h3>Trending <span class="suggest-sub">· hot now</span></h3>
                </div>
                <ul class="trend-list">
                  <li class="trend-item"><span class="trend-item__rank" aria-hidden="true">1</span><div class="trend-item__body"><span class="trend-item__tag">#ErasTour</span><span class="trend-item__meta">2.4M posts</span></div></li>
                  <li class="trend-item"><span class="trend-item__rank" aria-hidden="true">2</span><div class="trend-item__body"><span class="trend-item__tag">#Snaps</span><span class="trend-item__meta">1.8M posts</span></div></li>
                  <li class="trend-item"><span class="trend-item__rank" aria-hidden="true">3</span><div class="trend-item__body"><span class="trend-item__tag">#NewMusic</span><span class="trend-item__meta">982K posts</span></div></li>
                  <li class="trend-item"><span class="trend-item__rank" aria-hidden="true">4</span><div class="trend-item__body"><span class="trend-item__tag">#INRCLIQ</span><span class="trend-item__meta">3.1M posts</span></div></li>
                </ul>
              </section>
            </aside>
          </div>
        </div>
      </div>

      <button type="button" class="profile-jump-feed is-top-mode" id="jump-top" aria-label="Back to top" hidden>
        <span class="profile-jump-feed__icon" aria-hidden="true">{ICONS["up"]}</span>
      </button>
    </div>

    <!-- Mobile nav -->
    <nav class="mobile-nav" aria-label="Primary navigation">
      <a class="active" href="#" aria-label="Home" aria-current="page"><span class="nav-icon nav-icon--home" aria-hidden="true">{ICONS["home"]}</span>Home</a>
      <a href="#" aria-label="Snaps"><span class="nav-icon" aria-hidden="true">{ICONS["snaps"]}</span>Snaps</a>
      <a href="#" aria-label="Photos"><span class="nav-icon" aria-hidden="true">{ICONS["photos"]}</span>Photos</a>
      <a href="#" aria-label="Videos"><span class="nav-icon" aria-hidden="true">{ICONS["videos"]}</span>Videos</a>
      <a href="#" aria-label="Audio"><span class="nav-icon" aria-hidden="true">{ICONS["audio"]}</span>Audio</a>
      <button type="button" aria-label="More"><span class="nav-icon" aria-hidden="true">{ICONS["more"]}</span>More</button>
    </nav>
  </div>

  <script>
    (function () {{
      var html = document.documentElement;
      var themeBtn = document.getElementById("theme-toggle");
      if (themeBtn) {{
        themeBtn.addEventListener("click", function () {{
          var next = html.getAttribute("data-feed-theme") === "dark" ? "light" : "dark";
          html.setAttribute("data-feed-theme", next);
          themeBtn.setAttribute("aria-label", next === "dark" ? "Switch to light theme" : "Switch to dark theme");
          themeBtn.setAttribute("title", next === "dark" ? "Light mode" : "Dark mode");
        }});
      }}

      var filters = document.getElementById("feed-filters");
      var toggle = document.getElementById("filter-toggle");
      if (filters && toggle) {{
        toggle.addEventListener("click", function () {{
          var open = filters.classList.toggle("is-expanded");
          toggle.setAttribute("aria-expanded", open ? "true" : "false");
          toggle.setAttribute("aria-label", open ? "Hide category filters" : "Show category filters");
        }});
      }}

      document.querySelectorAll(".feed-filter").forEach(function (btn) {{
        btn.addEventListener("click", function () {{
          document.querySelectorAll(".feed-filter-item").forEach(function (item) {{
            item.classList.remove("is-active");
            var b = item.querySelector(".feed-filter");
            if (b) b.setAttribute("aria-selected", "false");
          }});
          var item = btn.closest(".feed-filter-item");
          if (item) item.classList.add("is-active");
          btn.setAttribute("aria-selected", "true");
        }});
      }});

      document.querySelectorAll(".follow-btn").forEach(function (btn) {{
        btn.addEventListener("click", function () {{
          btn.classList.toggle("is-following");
          btn.textContent = btn.classList.contains("is-following") ? "Following" : "Follow";
        }});
      }});

      document.querySelectorAll(".post-action--like").forEach(function (btn) {{
        btn.addEventListener("click", function () {{
          btn.classList.toggle("is-liked");
          btn.setAttribute("aria-pressed", btn.classList.contains("is-liked") ? "true" : "false");
        }});
      }});

      document.querySelectorAll(".post-action--save").forEach(function (btn) {{
        btn.addEventListener("click", function () {{
          btn.classList.toggle("is-saved");
          btn.setAttribute("aria-pressed", btn.classList.contains("is-saved") ? "true" : "false");
        }});
      }});

      var jump = document.getElementById("jump-top");
      if (jump) {{
        function updateJump() {{
          var y = window.scrollY || document.documentElement.scrollTop || 0;
          if (y > 480) jump.removeAttribute("hidden");
          else jump.setAttribute("hidden", "");
        }}
        window.addEventListener("scroll", updateJump, {{ passive: true }});
        updateJump();
        jump.addEventListener("click", function () {{
          window.scrollTo({{ top: 0, behavior: "smooth" }});
        }});
      }}
    }})();
  </script>
</body>
</html>
'''

OUT.write_text(html, encoding="utf-8")
print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")
