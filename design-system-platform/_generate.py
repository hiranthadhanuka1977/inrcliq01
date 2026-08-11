# -*- coding: utf-8 -*-
"""Generate design-system-platform index + sample page."""
from __future__ import annotations

from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent
COPY_SVG = (
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>'
    '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>'
)


def esc(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def html_to_jsx(src: str) -> str:
    import re

    out = src
    out = re.sub(r"<!--\s*(.*?)\s*-->", r"{/* \1 */}", out, flags=re.S)
    out = re.sub(r"\bclass=", "className=", out)
    out = re.sub(r"\bfor=", "htmlFor=", out)
    for a, b in [
        ("stroke-width=", "strokeWidth="),
        ("stroke-linecap=", "strokeLinecap="),
        ("stroke-linejoin=", "strokeLinejoin="),
        ("fill-rule=", "fillRule="),
        ("clip-rule=", "clipRule="),
        ("tabindex=", "tabIndex="),
        ("readonly", "readOnly"),
    ]:
        out = out.replace(a, b)

    def style_repl(m: re.Match[str]) -> str:
        css = m.group(1)
        parts = []
        for decl in css.split(";"):
            decl = decl.strip()
            if not decl or ":" not in decl:
                continue
            prop, val = decl.split(":", 1)
            prop = prop.strip()
            val = val.strip()
            # Keep CSS custom properties as quoted keys (--story-color)
            if prop.startswith("--"):
                prop_js = f'"{prop}"'
            else:
                prop_js = re.sub(r"-([a-z])", lambda x: x.group(1).upper(), prop)
            if re.fullmatch(r"-?\d+(\.\d+)?", val):
                parts.append(f"{prop_js}: {val}")
            else:
                parts.append(f'{prop_js}: "{val}"')
        return "style={{ " + ", ".join(parts) + " }}"

    out = re.sub(r'style="([^"]*)"', style_repl, out)
    return out


def markup(html_src: str) -> str:
    jsx = html_to_jsx(html_src)
    return f"""          <div class="ds-markup" data-markup-lang="html">
            <div class="ds-markup__header">
              <div class="ds-markup__switch" role="tablist" aria-label="Markup language">
                <button type="button" class="ds-markup__lang is-active" data-lang="html" role="tab" aria-selected="true">HTML</button>
                <button type="button" class="ds-markup__lang" data-lang="next" role="tab" aria-selected="false">Next.js</button>
              </div>
              <button type="button" class="ds-markup__copy" aria-label="Copy markup" title="Copy markup">{COPY_SVG}</button>
            </div>
            <pre class="ds-markup__code" data-lang="html"><code>{esc(html_src)}</code></pre>
            <pre class="ds-markup__code" data-lang="next" hidden><code>{esc(jsx)}</code></pre>
          </div>"""


def subsection(title: str, demo: str, html_src: str, demo_class: str = "ds-demo ds-demo--has-markup") -> str:
    return f"""
        <div class="ds-subsection">
          <h3 class="ds-subsection__title">{title}</h3>
          <div class="{demo_class}">
{demo}
          </div>
{markup(html_src)}
        </div>"""


# ——— Demo snippets ———

ICON_HOME = """<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>"""
ICON_MSG = """<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>"""
ICON_AUDIO = """<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>"""

LEFT_NAV_DEMO = f"""            <div class="ds-feed-frame feed-path-shell">
              <aside class="left-nav ds-feed-frame__nav">
                <div class="left-nav__body">
                  <div class="left-nav__header">
                    <div class="brand">INRCLIQ<span class="dot">.</span></div>
                  </div>
                  <nav>
                    <a class="nav-item active" href="#"><span class="nav-item__label"><span class="nav-icon nav-icon--home" aria-hidden="true">{ICON_HOME}</span><span class="nav-item__text">Home</span></span></a>
                    <a class="nav-item" href="#"><span class="nav-item__label"><span class="nav-icon" aria-hidden="true">{ICON_MSG}</span><span class="nav-item__text">Messages<span class="badge">3</span></span></span></a>
                    <hr class="nav-separator" />
                    <a class="nav-item" href="#"><span class="nav-item__label"><span class="nav-icon" aria-hidden="true">{ICON_AUDIO}</span><span class="nav-item__text">Audio</span></span></a>
                  </nav>
                </div>
                <div class="nav-create">
                  <button type="button" class="nav-create__btn">Create</button>
                </div>
              </aside>
            </div>"""

LEFT_NAV_MARKUP = """<aside class="left-nav">
  <div class="left-nav__body">
    <div class="left-nav__header">
      <div class="brand">INRCLIQ<span class="dot">.</span></div>
    </div>
    <nav>
      <a class="nav-item active" href="/feed">
        <span class="nav-item__label">
          <span class="nav-icon nav-icon--home" aria-hidden="true"><!-- icon --></span>
          <span class="nav-item__text">Home</span>
        </span>
      </a>
      <a class="nav-item" href="/feed/messages">
        <span class="nav-item__label">
          <span class="nav-icon" aria-hidden="true"><!-- icon --></span>
          <span class="nav-item__text">Messages<span class="badge">3</span></span>
        </span>
      </a>
    </nav>
  </div>
  <div class="nav-create">
    <button type="button" class="nav-create__btn">Create</button>
  </div>
</aside>"""

MOBILE_NAV_DEMO = f"""            <div class="ds-feed-frame feed-path-shell" style="padding:var(--space-4)">
              <nav class="mobile-nav ds-mobile-nav-demo" aria-label="Primary navigation">
                <a class="active" href="#" aria-label="Home" aria-current="page"><span class="nav-icon nav-icon--home" aria-hidden="true">{ICON_HOME}</span>Home</a>
                <a href="#" aria-label="Messages"><span class="nav-icon" aria-hidden="true">{ICON_MSG}</span>Messages</a>
                <a href="#" aria-label="Audio"><span class="nav-icon" aria-hidden="true">{ICON_AUDIO}</span>Audio</a>
                <button type="button" aria-label="More"><span class="nav-icon" aria-hidden="true">···</span>More</button>
              </nav>
            </div>"""

MOBILE_NAV_MARKUP = """<nav class="mobile-nav" aria-label="Primary navigation">
  <a class="active" href="/feed" aria-current="page">
    <span class="nav-icon nav-icon--home" aria-hidden="true"><!-- home --></span>
    Home
  </a>
  <a href="/feed/messages" aria-label="Messages">
    <span class="nav-icon" aria-hidden="true"><!-- messages --></span>
    Messages
  </a>
  <button type="button" aria-label="More" aria-haspopup="menu">
    <span class="nav-icon" aria-hidden="true"><!-- more --></span>
    More
  </button>
</nav>"""

PLUS_SVG = (
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" '
    'stroke-linecap="round" aria-hidden="true">'
    '<line x1="12" y1="5" x2="12" y2="19" />'
    '<line x1="5" y1="12" x2="19" y2="12" /></svg>'
)
CHEV_PREV = (
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" '
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    '<polyline points="15 18 9 12 15 6" /></svg>'
)
CHEV_NEXT = (
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" '
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    '<polyline points="9 18 15 12 9 6" /></svg>'
)

IMG_TAYLOR = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=120&amp;q=80&amp;auto=format&amp;fit=crop"
IMG_BRUNO = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=120&amp;q=80&amp;auto=format&amp;fit=crop"
IMG_DUA = "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=120&amp;q=80&amp;auto=format&amp;fit=crop"
IMG_DRAKE = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=120&amp;q=80&amp;auto=format&amp;fit=crop"
IMG_ADELE = "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=120&amp;q=80&amp;auto=format&amp;fit=crop"


def story_item_html(
    *,
    name: str,
    ring: str,
    color: str,
    offline: bool = False,
    image: str | None = None,
    initials: str | None = None,
    snap: bool = False,
) -> str:
    """Build a single .story anchor matching StoriesBar.tsx."""
    if snap:
        return f"""<a class="story story--snap" href="#">
  <div class="story-avatar-ring story-avatar-ring--muted">
    <div class="story-avatar story-avatar--snap" aria-hidden="true">
      {PLUS_SVG}
    </div>
  </div>
  <span>Your Snap</span>
</a>"""
    offline_cls = " story-avatar--offline" if offline else ""
    if image:
        face = f'<img src="{image}" alt="{name}" />'
    else:
        face = initials or name[:1]
    return f"""<a class="story" href="#">
  <div class="story-avatar-ring story-avatar-ring--{ring}">
    <div class="story-avatar{offline_cls}" style="--story-color: {color}">
      {face}
    </div>
  </div>
  <span>{name}</span>
</a>"""


def story_demo_wrap(item_html: str, label: str = "") -> str:
    label_html = f'<p class="ds-state-label">{label}</p>' if label else ""
    return f"""            <div class="ds-feed-frame feed-path-shell ds-story-state">
              {label_html}
              <div class="stories-bar" aria-label="Story state">
                <div class="stories">
                  <div class="stories-track ds-story-state__track">
{item_html}
                  </div>
                </div>
              </div>
            </div>"""


# Axes: ring (gradient=unread, muted=viewed) × presence × face
STORY_STATES: list[dict] = [
    {
        "id": "your-snap",
        "title": "Your Snap",
        "desc": "<code>story--snap</code> + muted ring + <code>story-avatar--snap</code>. Plus icon; online dot is forced off.",
        "kwargs": {"name": "Your Snap", "ring": "muted", "color": "#1241a6", "snap": True},
    },
    {
        "id": "unread-online-image",
        "title": "Unread · online · image",
        "desc": "Gradient ring + photo avatar. Default presence shows the green online dot.",
        "kwargs": {
            "name": "Taylor",
            "ring": "gradient",
            "color": "#4f46e5",
            "image": IMG_TAYLOR,
        },
    },
    {
        "id": "unread-online-initials",
        "title": "Unread · online · initials",
        "desc": "Gradient ring + initials face via <code>--story-color</code>.",
        "kwargs": {
            "name": "Olivia",
            "ring": "gradient",
            "color": "#6d28d9",
            "initials": "OR",
        },
    },
    {
        "id": "unread-offline-image",
        "title": "Unread · offline · image",
        "desc": "Gradient ring + photo + <code>story-avatar--offline</code> (hides presence dot).",
        "kwargs": {
            "name": "Dua",
            "ring": "gradient",
            "color": "#c026d3",
            "image": IMG_DUA,
            "offline": True,
        },
    },
    {
        "id": "unread-offline-initials",
        "title": "Unread · offline · initials",
        "desc": "Gradient ring + initials + offline.",
        "kwargs": {
            "name": "Miley",
            "ring": "gradient",
            "color": "#ef4444",
            "initials": "MC",
            "offline": True,
        },
    },
    {
        "id": "viewed-online-image",
        "title": "Viewed · online · image",
        "desc": "Muted ring (<code>story-avatar-ring--muted</code>) + photo + online.",
        "kwargs": {
            "name": "Adele",
            "ring": "muted",
            "color": "#b45309",
            "image": IMG_ADELE,
        },
    },
    {
        "id": "viewed-online-initials",
        "title": "Viewed · online · initials",
        "desc": "Muted ring + initials + online.",
        "kwargs": {
            "name": "Ed S.",
            "ring": "muted",
            "color": "#166534",
            "initials": "ED",
        },
    },
    {
        "id": "viewed-offline-image",
        "title": "Viewed · offline · image",
        "desc": "Muted ring + photo + offline.",
        "kwargs": {
            "name": "Drake",
            "ring": "muted",
            "color": "#374151",
            "image": IMG_DRAKE,
            "offline": True,
        },
    },
    {
        "id": "viewed-offline-initials",
        "title": "Viewed · offline · initials",
        "desc": "Muted ring + initials + offline — common for viewed peers without photos.",
        "kwargs": {
            "name": "Jennifer",
            "ring": "muted",
            "color": "#8b5cf6",
            "initials": "JL",
            "offline": True,
        },
    },
]


def build_stories_section() -> str:
    """Full Stories section: composition, state matrix with per-state markup, chrome."""
    parts: list[str] = []
    parts.append("""
      <section class="ds-section" id="stories">
        <div class="ds-section__header">
          <h2 class="ds-section__title">Stories</h2>
          <p class="ds-section__description">
            Horizontal strip at the top of <code>/feed</code>. Item variants are composed from three axes:
            <strong>ring</strong> (gradient = unread, muted = viewed),
            <strong>presence</strong> (online dot vs <code>story-avatar--offline</code>),
            and <strong>face</strong> (image, initials, or Your Snap plus icon).
            There is no separate <code>unread</code> / <code>live</code> / <code>verified</code> class on story items.
          </p>
        </div>
""")

    # —— Full bar composition ——
    bar_items = [
        story_item_html(name="Your Snap", ring="muted", color="#1241a6", snap=True),
        story_item_html(name="Taylor", ring="gradient", color="#4f46e5", image=IMG_TAYLOR),
        story_item_html(name="Jennifer", ring="muted", color="#8b5cf6", initials="JL", offline=True),
        story_item_html(name="Bruno", ring="gradient", color="#a21caf", image=IMG_BRUNO),
        story_item_html(name="Dua", ring="gradient", color="#c026d3", image=IMG_DUA, offline=True),
        story_item_html(name="Billie", ring="muted", color="#0f766e", initials="BE", offline=True),
        story_item_html(name="Olivia", ring="gradient", color="#6d28d9", initials="OR"),
        story_item_html(name="Ed S.", ring="muted", color="#166534", initials="ED"),
        story_item_html(name="Adele", ring="muted", color="#b45309", image=IMG_ADELE),
        story_item_html(name="Drake", ring="muted", color="#374151", image=IMG_DRAKE, offline=True),
    ]
    track_inner = "\n".join("                    " + line for item in bar_items for line in item.splitlines())
    STORIES_BAR_DEMO = f"""            <div class="ds-feed-frame feed-path-shell">
              <section class="stories-bar" aria-label="Stories">
                <div class="stories has-next">
                  <div class="stories-track" id="ds-stories-track">
{track_inner}
                  </div>
                  <button class="story-nav story-nav--prev" type="button" aria-label="Previous stories" disabled>{CHEV_PREV}</button>
                  <button class="story-nav story-nav--next is-visible" type="button" aria-label="Next stories">{CHEV_NEXT}</button>
                </div>
              </section>
            </div>"""
    STORIES_BAR_MARKUP = f"""<section class="stories-bar" aria-label="Stories">
  <div class="stories has-next">
    <div class="stories-track" id="stories-track">
      <!-- Your Snap + peer stories -->
{story_item_html(name="Your Snap", ring="muted", color="#1241a6", snap=True)}
{story_item_html(name="Taylor", ring="gradient", color="#4f46e5", image=IMG_TAYLOR)}
      <!-- …more stories… -->
    </div>
    <button class="story-nav story-nav--prev" type="button" aria-label="Previous stories" disabled>
      <!-- chevron -->
    </button>
    <button class="story-nav story-nav--next is-visible" type="button" aria-label="Next stories">
      <!-- chevron -->
    </button>
  </div>
</section>"""
    parts.append(subsection("Full bar", STORIES_BAR_DEMO, STORIES_BAR_MARKUP))

    # —— Axis reference table ——
    parts.append("""
        <div class="ds-subsection">
          <h3 class="ds-subsection__title">State axes</h3>
          <table class="token-table">
            <thead><tr><th>Axis</th><th>Classes</th><th>Meaning</th></tr></thead>
            <tbody>
              <tr><td>Entry</td><td><code>story</code> / <code>story story--snap</code></td><td>Peer story vs Your Snap</td></tr>
              <tr><td>Ring</td><td><code>story-avatar-ring--gradient</code></td><td>Unread / unviewed</td></tr>
              <tr><td>Ring</td><td><code>story-avatar-ring--muted</code></td><td>Viewed (or snap shell)</td></tr>
              <tr><td>Presence</td><td>default <code>.story-avatar::after</code></td><td>Online green dot</td></tr>
              <tr><td>Presence</td><td><code>story-avatar--offline</code></td><td>Hide online dot</td></tr>
              <tr><td>Snap face</td><td><code>story-avatar--snap</code></td><td>Plus icon; forces no presence dot</td></tr>
              <tr><td>Face</td><td><code>&lt;img&gt;</code> or initials text</td><td>Photo vs <code>--story-color</code> initials</td></tr>
              <tr><td>Chrome</td><td><code>.stories.has-prev</code> / <code>.has-next</code></td><td>Edge fade when scrollable</td></tr>
              <tr><td>Chrome</td><td><code>.story-nav.is-visible</code></td><td>Show carousel chevrons</td></tr>
              <tr><td>Chrome</td><td><code>.feed-header.is-stories-collapsed</code></td><td>Scroll-hide the bar on home</td></tr>
            </tbody>
          </table>
        </div>
""")

    # —— Visual matrix (all states at a glance) ——
    matrix_cells = []
    for st in STORY_STATES:
        item = story_item_html(**st["kwargs"])
        # indent for nested HTML
        indented = "\n".join("                      " + ln for ln in item.splitlines())
        matrix_cells.append(
            f"""              <div class="ds-story-matrix__cell">
                <span class="ds-story-matrix__caption">{st["title"]}</span>
                <div class="stories">
                  <div class="stories-track ds-story-state__track">
{indented}
                  </div>
                </div>
              </div>"""
        )
    parts.append(f"""
        <div class="ds-subsection">
          <h3 class="ds-subsection__title">State matrix</h3>
          <p class="ds-subsection__note">All production combinations. Markup for each state is documented below.</p>
          <div class="ds-demo">
            <div class="ds-feed-frame feed-path-shell">
              <div class="ds-story-matrix">
{chr(10).join(matrix_cells)}
              </div>
            </div>
          </div>
        </div>
""")

    # —— Per-state markup ——
    for st in STORY_STATES:
        item = story_item_html(**st["kwargs"])
        indented = "\n".join("                    " + ln for ln in item.splitlines())
        demo = f"""            <div class="ds-feed-frame feed-path-shell ds-story-state">
              <p class="ds-state-label">{st["desc"]}</p>
              <div class="stories-bar">
                <div class="stories">
                  <div class="stories-track ds-story-state__track">
{indented}
                  </div>
                </div>
              </div>
            </div>"""
        parts.append(subsection(st["title"], demo, item))

    # —— Chrome: nav + collapse ——
    chrome_demo = f"""            <div class="ds-feed-frame feed-path-shell ds-demo--stack" style="gap:var(--space-5)">
              <div>
                <p class="ds-state-label">Carousel chrome — <code>has-prev</code> / <code>has-next</code> fades + <code>story-nav.is-visible</code></p>
                <section class="stories-bar" aria-label="Stories chrome">
                  <div class="stories has-prev has-next">
                    <div class="stories-track">
                      {story_item_html(name="Your Snap", ring="muted", color="#1241a6", snap=True)}
                      {story_item_html(name="Taylor", ring="gradient", color="#4f46e5", image=IMG_TAYLOR)}
                      {story_item_html(name="Bruno", ring="gradient", color="#a21caf", image=IMG_BRUNO)}
                      {story_item_html(name="Jennifer", ring="muted", color="#8b5cf6", initials="JL", offline=True)}
                    </div>
                    <button class="story-nav story-nav--prev is-visible" type="button" aria-label="Previous stories">{CHEV_PREV}</button>
                    <button class="story-nav story-nav--next is-visible" type="button" aria-label="Next stories">{CHEV_NEXT}</button>
                  </div>
                </section>
              </div>
              <div>
                <p class="ds-state-label">Collapsed — parent <code>.feed-header.is-stories-collapsed</code> (scroll-hide on home)</p>
                <div class="feed-header is-stories-collapsed">
                  <section class="stories-bar" aria-label="Collapsed stories">
                    <div class="stories">
                      <div class="stories-track">
                        {story_item_html(name="Your Snap", ring="muted", color="#1241a6", snap=True)}
                        {story_item_html(name="Taylor", ring="gradient", color="#4f46e5", image=IMG_TAYLOR)}
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>"""
    chrome_markup = """<!-- Carousel edge fades + nav -->
<div class="stories has-prev has-next">
  <div class="stories-track" id="stories-track"><!-- items --></div>
  <button class="story-nav story-nav--prev is-visible" type="button" aria-label="Previous stories"></button>
  <button class="story-nav story-nav--next is-visible" type="button" aria-label="Next stories"></button>
</div>

<!-- Scroll-hide on home (applied by useStoriesScrollHide) -->
<div class="feed-header is-stories-collapsed">
  <section class="stories-bar" aria-label="Stories"><!-- … --></section>
</div>"""
    parts.append(subsection("Chrome · nav &amp; collapse", chrome_demo, chrome_markup))

    parts.append("      </section>")
    return "\n".join(parts)

FILTERS_DEMO = """            <div class="ds-feed-frame feed-path-shell">
              <section class="feed-filters feed-filters--audio feed-filters--collapsible feed-filters--in-feed feed-landing is-expanded" aria-label="Feed categories">
                <div class="feed-landing__header">
                  <section class="spotify-landing" aria-label="Quick access">
                    <div class="spotify-landing__intro">
                      <div class="spotify-landing__greeting-row">
                        <a href="#" class="spotify-landing__avatar spotify-landing__avatar--live" style="--story-color:#0d9488" aria-label="Profile">HI</a>
                        <h1 class="spotify-landing__greeting">Good morning, Hiran</h1>
                      </div>
                    </div>
                  </section>
                  <button type="button" class="feed-filters__toggle" aria-expanded="true" aria-label="Hide category filters">
                    <svg viewBox="0 0 24 24" aria-hidden="true" class="feed-filters__toggle-icon"><path d="M4 7h16M7 12h10M10 17h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="7" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="17" r="2" fill="currentColor"/></svg>
                  </button>
                </div>
                <div class="feed-filters__pills-wrap">
                  <div class="feed-filters__pills-inner">
                    <div class="feed-filters__track feed-filters__track--audio" role="tablist">
                      <span class="feed-filter-item is-active"><button type="button" role="tab" aria-selected="true" class="feed-filter">All</button></span>
                      <span class="feed-filter-item"><button type="button" role="tab" aria-selected="false" class="feed-filter">Music</button></span>
                      <span class="feed-filter-item"><button type="button" role="tab" aria-selected="false" class="feed-filter">Discovery</button></span>
                      <span class="feed-filter-item"><button type="button" role="tab" aria-selected="false" class="feed-filter">Comedy</button></span>
                    </div>
                  </div>
                </div>
              </section>
            </div>"""

FILTERS_MARKUP = """<section class="feed-filters feed-filters--audio feed-filters--collapsible feed-filters--in-feed feed-landing is-expanded" aria-label="Feed categories">
  <div class="feed-landing__header">
    <section class="spotify-landing">
      <div class="spotify-landing__greeting-row">
        <a href="/feed/me" class="spotify-landing__avatar spotify-landing__avatar--live" style="--story-color: #0d9488">HI</a>
        <h1 class="spotify-landing__greeting">Good morning, Hiran</h1>
      </div>
    </section>
    <button type="button" class="feed-filters__toggle" aria-expanded="true"><!-- filter icon --></button>
  </div>
  <div class="feed-filters__pills-wrap">
    <div class="feed-filters__track feed-filters__track--audio" role="tablist">
      <span class="feed-filter-item is-active">
        <button type="button" role="tab" aria-selected="true" class="feed-filter">All</button>
      </span>
      <span class="feed-filter-item">
        <button type="button" role="tab" aria-selected="false" class="feed-filter">Music</button>
      </span>
    </div>
  </div>
</section>"""

ICON_HEART = """<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>"""
ICON_COMMENT = """<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>"""
ICON_SHARE = """<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>"""
ICON_SAVE = """<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>"""
ICON_VERIFIED = """<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 7.1-1.01L12 2z"/></svg>"""
ICON_PLAY = """<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="23" fill="#fff" stroke="#fff" stroke-width="2"/><path d="M19 15.5v17l14-8.5-14-8.5z" fill="#111"/></svg>"""
ICON_MORE = """<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.75"/><circle cx="12" cy="12" r="1.75"/><circle cx="19" cy="12" r="1.75"/></svg>"""

POST_DEMO = f"""            <div class="ds-feed-frame feed-path-shell" style="max-width:520px">
              <article class="post post--simple">
                <div class="post-head">
                  <div class="post-head__author">
                    <div class="post-head__avatar" style="--story-color:#1241a6" aria-hidden="true">
                      <img src="assets/creators/avatar.jpg" alt="" />
                    </div>
                    <div class="post-head__identity">
                      <div class="post-head__name-row">
                        <strong class="post-head__name">Bathiya &amp; Santhush</strong>
                        <span class="post-head__badge"><span class="post-head__badge-icon">{ICON_VERIFIED}</span> Verified</span>
                        <button type="button" class="follow-btn post-head__follow">Follow</button>
                      </div>
                      <div class="post-head__meta-line">
                        <span class="post-head__handle">@bathiya</span>
                        <span class="post-head__meta-dot" aria-hidden="true">·</span>
                        <time class="post-head__time">2h</time>
                      </div>
                    </div>
                  </div>
                  <div class="post-head__tools">
                    <button type="button" class="more" aria-label="More options">{ICON_MORE}</button>
                  </div>
                </div>
                <div class="post__body">
                  <div class="post-tags"><span class="tag">Music</span><span class="tag">Live</span></div>
                  <p>New stage moments from the weekend show. Which song should we open with next?</p>
                  <div class="post-media">
                    <img src="assets/creators/feed.jpg" alt="Live performance" />
                    <div class="post-media__play" aria-hidden="true"><span>{ICON_PLAY}</span></div>
                  </div>
                </div>
                <div class="post-footer">
                  <div class="post-actions post-actions--engage" role="group" aria-label="Post actions">
                    <button type="button" class="post-action post-action--like is-liked" aria-label="Like" aria-pressed="true">{ICON_HEART}<span class="post-action__count">12.4K</span></button>
                    <button type="button" class="post-action post-action--comment" aria-label="Comment">{ICON_COMMENT}<span class="post-action__count">864</span></button>
                    <button type="button" class="post-action post-action--share" aria-label="Share">{ICON_SHARE}</button>
                    <button type="button" class="post-action post-action--save is-saved" aria-label="Bookmark" aria-pressed="true">{ICON_SAVE}</button>
                  </div>
                </div>
              </article>
            </div>"""

POST_MARKUP = """<article class="post post--simple">
  <div class="post-head">
    <div class="post-head__author">
      <div class="post-head__avatar" style="--story-color: #1241a6" aria-hidden="true">
        <img src="/assets/creators/avatar.jpg" alt="" />
      </div>
      <div class="post-head__identity">
        <div class="post-head__name-row">
          <strong class="post-head__name">Bathiya &amp; Santhush</strong>
          <span class="post-head__badge"><!-- verified icon --> Verified</span>
          <button type="button" class="follow-btn post-head__follow">Follow</button>
        </div>
        <div class="post-head__meta-line">
          <span class="post-head__handle">@bathiya</span>
          <time class="post-head__time">2h</time>
        </div>
      </div>
    </div>
  </div>
  <div class="post__body">
    <div class="post-tags"><span class="tag">Music</span></div>
    <p>New stage moments from the weekend show.</p>
    <div class="post-media">
      <img src="/assets/creators/feed.jpg" alt="Live performance" />
      <div class="post-media__play" aria-hidden="true"><span><!-- play --></span></div>
    </div>
  </div>
  <div class="post-footer">
    <div class="post-actions post-actions--engage">
      <button type="button" class="post-action post-action--like is-liked" aria-pressed="true" aria-label="Like">
        <!-- heart --><span class="post-action__count">12.4K</span>
      </button>
      <button type="button" class="post-action post-action--comment" aria-label="Comment">
        <!-- comment --><span class="post-action__count">864</span>
      </button>
      <button type="button" class="post-action post-action--share" aria-label="Share"><!-- share --></button>
      <button type="button" class="post-action post-action--save is-saved" aria-pressed="true" aria-label="Bookmark"><!-- save --></button>
    </div>
  </div>
</article>"""

POST_ACTIONS_DEMO = f"""            <div class="ds-feed-frame feed-path-shell ds-demo--inline" style="padding:var(--space-5);flex-wrap:wrap;gap:var(--space-6)">
              <div class="ds-state-pair">
                <p class="ds-state-label">Default</p>
                <div class="post-actions post-actions--engage" role="group">
                  <button type="button" class="post-action post-action--like" aria-label="Like">{ICON_HEART}<span class="post-action__count">128</span></button>
                  <button type="button" class="post-action post-action--comment" aria-label="Comment">{ICON_COMMENT}<span class="post-action__count">12</span></button>
                  <button type="button" class="post-action post-action--share" aria-label="Share">{ICON_SHARE}</button>
                  <button type="button" class="post-action post-action--save" aria-label="Bookmark">{ICON_SAVE}</button>
                </div>
              </div>
              <div class="ds-state-pair">
                <p class="ds-state-label">Liked + saved</p>
                <div class="post-actions post-actions--engage" role="group">
                  <button type="button" class="post-action post-action--like is-liked" aria-pressed="true" aria-label="Like">{ICON_HEART}<span class="post-action__count">129</span></button>
                  <button type="button" class="post-action post-action--comment" aria-label="Comment">{ICON_COMMENT}<span class="post-action__count">12</span></button>
                  <button type="button" class="post-action post-action--share" aria-label="Share">{ICON_SHARE}</button>
                  <button type="button" class="post-action post-action--save is-saved" aria-pressed="true" aria-label="Bookmark">{ICON_SAVE}</button>
                </div>
              </div>
            </div>"""

POST_ACTIONS_MARKUP = """<!-- Default -->
<button type="button" class="post-action post-action--like" aria-label="Like">…</button>
<button type="button" class="post-action post-action--save" aria-label="Bookmark">…</button>

<!-- Pressed -->
<button type="button" class="post-action post-action--like is-liked" aria-pressed="true" aria-label="Like">…</button>
<button type="button" class="post-action post-action--save is-saved" aria-pressed="true" aria-label="Bookmark">…</button>"""

SNAP_TILE = f"""<a class="snap-tile" href="#">
  <img src="{IMG_DUA}" alt="" />
  <div class="snap-tile__play" aria-hidden="true"><span>{ICON_PLAY}</span></div>
  <span class="snap-tile__duration">0:41</span>
  <div class="snap-tile__overlay">
    <span class="snap-tile__views">4.1M views</span>
    <span class="snap-tile__creator">
      <span class="snap-tile__avatar"><img src="{IMG_BRUNO}" alt="" /></span>
      <span class="snap-tile__handle">@streetbeats · <span class="snap-tile__meta">viral</span></span>
    </span>
  </div>
</a>"""

SNAPS_DEMO = f"""            <div class="ds-feed-frame feed-path-shell" style="max-width:520px;padding:var(--space-4)">
              <div class="feed-surface feed-surface--simple">
                <section class="rail snaps-rail" aria-label="Snaps">
                  <div class="rail-title">
                    <h3>Snaps · because you watched Dua Lipa</h3>
                    <a class="rail-title__link" href="#">See all →</a>
                  </div>
                  <div class="snap-grid">
                    {SNAP_TILE}
                    <a class="snap-tile" href="#">
                      <img src="{IMG_TAYLOR}" alt="" />
                      <div class="snap-tile__play" aria-hidden="true"><span>{ICON_PLAY}</span></div>
                      <span class="snap-tile__duration">0:36</span>
                      <div class="snap-tile__overlay">
                        <span class="snap-tile__views">2.8M views</span>
                        <span class="snap-tile__creator">
                          <span class="snap-tile__avatar"><img src="{IMG_ADELE}" alt="" /></span>
                          <span class="snap-tile__handle">@nomadlens · <span class="snap-tile__meta">viral</span></span>
                        </span>
                      </div>
                    </a>
                    <a class="snap-tile" href="#">
                      <img src="{IMG_DRAKE}" alt="" />
                      <div class="snap-tile__play" aria-hidden="true"><span>{ICON_PLAY}</span></div>
                      <span class="snap-tile__duration">0:48</span>
                      <div class="snap-tile__overlay">
                        <span class="snap-tile__views">1.9M views</span>
                        <span class="snap-tile__creator">
                          <span class="snap-tile__avatar"><img src="{IMG_TAYLOR}" alt="" /></span>
                          <span class="snap-tile__handle">@daydream · <span class="snap-tile__meta">music</span></span>
                        </span>
                      </div>
                    </a>
                  </div>
                </section>
              </div>
            </div>"""

SNAPS_MARKUP = """<section class="rail snaps-rail" aria-label="Snaps">
  <div class="rail-title">
    <h3>Snaps · because you watched Dua Lipa</h3>
    <a class="rail-title__link" href="#">See all →</a>
  </div>
  <div class="snap-grid">
    <a class="snap-tile" href="#">
      <img src="…" alt="" />
      <div class="snap-tile__play" aria-hidden="true"><span><!-- play --></span></div>
      <span class="snap-tile__duration">0:41</span>
      <div class="snap-tile__overlay">
        <span class="snap-tile__views">4.1M views</span>
        <span class="snap-tile__creator">
          <span class="snap-tile__avatar"><img src="…" alt="" /></span>
          <span class="snap-tile__handle">@streetbeats · <span class="snap-tile__meta">viral</span></span>
        </span>
      </div>
    </a>
  </div>
</section>"""

CREATORS_DEMO = f"""            <div class="ds-feed-frame feed-path-shell" style="padding:var(--space-4)">
              <section class="audio-top-creators" aria-label="Top creators">
                <div class="rail-title">
                  <h3>Top Creators</h3>
                  <span class="audio-section__subtitle">Artists, hosts, and narrators rising this week</span>
                </div>
                <div class="audio-top-creators__row">
                  <article class="audio-top-creator-card">
                    <a href="#" class="audio-top-creator-card__hit" aria-label="View Billie Eilish">
                      <span class="audio-top-creator-card__art"><img src="{IMG_TAYLOR}" alt="" /></span>
                      <span class="audio-top-creator-card__body">
                        <strong class="audio-top-creator-card__name">Billie Eilish <span class="audio-top-creator-card__verified" aria-label="Verified">{ICON_VERIFIED}</span></strong>
                        <span class="audio-top-creator-card__handle">@billieeilish</span>
                        <span class="audio-top-creator-card__meta">Music · 12.4M monthly</span>
                      </span>
                    </a>
                    <button type="button" class="follow-btn audio-top-creator-card__follow">Follow</button>
                  </article>
                  <article class="audio-top-creator-card">
                    <a href="#" class="audio-top-creator-card__hit" aria-label="View Hard Fork">
                      <span class="audio-top-creator-card__art"><img src="{IMG_DRAKE}" alt="" /></span>
                      <span class="audio-top-creator-card__body">
                        <strong class="audio-top-creator-card__name">Hard Fork</strong>
                        <span class="audio-top-creator-card__handle">@hardfork</span>
                        <span class="audio-top-creator-card__meta">Podcast · 2.1M monthly</span>
                      </span>
                    </a>
                    <button type="button" class="follow-btn audio-top-creator-card__follow is-following">Following</button>
                  </article>
                </div>
              </section>
            </div>"""

CREATORS_MARKUP = """<section class="audio-top-creators" aria-label="Top creators">
  <div class="rail-title">
    <h3>Top Creators</h3>
    <span class="audio-section__subtitle">Artists, hosts, and narrators rising this week</span>
  </div>
  <div class="audio-top-creators__row">
    <article class="audio-top-creator-card">
      <a href="#" class="audio-top-creator-card__hit" aria-label="View Billie Eilish">
        <span class="audio-top-creator-card__art"><img src="…" alt="" /></span>
        <span class="audio-top-creator-card__body">
          <strong class="audio-top-creator-card__name">Billie Eilish</strong>
          <span class="audio-top-creator-card__handle">@billieeilish</span>
          <span class="audio-top-creator-card__meta">Music · 12.4M monthly</span>
        </span>
      </a>
      <button type="button" class="follow-btn audio-top-creator-card__follow">Follow</button>
    </article>
  </div>
</section>"""

FOLLOW_DEMO = """            <div class="ds-feed-frame feed-path-shell ds-demo--inline" style="padding:var(--space-5);gap:var(--space-4)">
              <button type="button" class="follow-btn">Follow</button>
              <button type="button" class="follow-btn is-following">Following</button>
            </div>"""

FOLLOW_MARKUP = """<button type="button" class="follow-btn">Follow</button>
<button type="button" class="follow-btn is-following">Following</button>"""

RAIL_DEMO = """            <div class="ds-feed-frame feed-path-shell" style="max-width:320px">
              <aside class="right-rail" style="position:relative;width:100%">
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
                  </ul>
                </section>
                <section class="rail-widget">
                  <div class="rail-widget__head"><h3>Trending <span class="suggest-sub">· hot now</span></h3></div>
                  <ul class="trend-list">
                    <li class="trend-item"><span class="trend-item__rank">1</span><div class="trend-item__body"><span class="trend-item__tag">#ErasTour</span><span class="trend-item__meta">2.4M posts</span></div></li>
                    <li class="trend-item"><span class="trend-item__rank">2</span><div class="trend-item__body"><span class="trend-item__tag">#INRCLIQ</span><span class="trend-item__meta">3.1M posts</span></div></li>
                  </ul>
                </section>
              </aside>
            </div>"""

RAIL_MARKUP = """<aside class="right-rail">
  <section class="rail-widget">
    <div class="rail-widget__head">
      <h3>Suggested</h3>
      <a class="rail-widget__link" href="#">See all</a>
    </div>
    <ul class="suggest-list">
      <li class="suggest-item">
        <div class="suggest-item__av" style="--story-color: #8b5cf6">JL</div>
        <div class="suggest-item__body">
          <span class="suggest-item__name">Jennifer Lopez</span>
          <span class="suggest-item__meta">48.2M followers</span>
        </div>
        <button type="button" class="follow-btn suggest-item__btn">Follow</button>
      </li>
    </ul>
  </section>
</aside>"""

LOADING_DEMO = """            <div class="ds-feed-frame feed-path-shell" style="max-width:520px;padding:var(--space-4)">
              <div class="feed-loading" role="status" aria-label="Loading feed">
                <article class="feed-loading__card" aria-hidden="true">
                  <div class="feed-loading__shimmer feed-loading__shimmer--head"></div>
                  <div class="feed-loading__shimmer feed-loading__shimmer--line"></div>
                  <div class="feed-loading__shimmer feed-loading__shimmer--line feed-loading__shimmer--short"></div>
                  <div class="feed-loading__shimmer feed-loading__shimmer--media"></div>
                  <div class="feed-loading__shimmer feed-loading__shimmer--footer"></div>
                </article>
              </div>
            </div>"""

LOADING_MARKUP = """<div class="feed-loading" role="status" aria-label="Loading feed">
  <article class="feed-loading__card" aria-hidden="true">
    <div class="feed-loading__shimmer feed-loading__shimmer--head"></div>
    <div class="feed-loading__shimmer feed-loading__shimmer--line"></div>
    <div class="feed-loading__shimmer feed-loading__shimmer--media"></div>
    <div class="feed-loading__shimmer feed-loading__shimmer--footer"></div>
  </article>
</div>"""

BUTTONS_DEMO = """            <div class="ds-feed-frame feed-path-shell ds-demo--inline" style="padding:var(--space-5);flex-wrap:wrap">
              <button type="button" class="btn btn--primary"><span class="btn__label">Primary</span></button>
              <button type="button" class="btn btn--secondary">Secondary</button>
              <button type="button" class="btn btn--outline-brand btn--sm">Outline sm</button>
              <button type="button" class="btn btn--warning btn--sm">Warning</button>
            </div>"""

BUTTONS_MARKUP = """<button type="button" class="btn btn--primary"><span class="btn__label">Primary</span></button>
<button type="button" class="btn btn--secondary">Secondary</button>
<button type="button" class="btn btn--outline-brand btn--sm">Outline sm</button>
<button type="button" class="btn btn--warning btn--sm">Warning</button>"""

THEME_DEMO = """            <div class="ds-demo--inline" style="gap:var(--space-4)">
              <div class="token-swatch" style="min-width:140px"><div class="token-swatch__color" style="background:var(--color-bg-page);border:1px solid var(--color-border-default)"></div><div class="token-swatch__info"><div class="token-swatch__name">bg-page</div><div class="token-swatch__value">theme surface</div></div></div>
              <div class="token-swatch" style="min-width:140px"><div class="token-swatch__color" style="background:var(--feed-divider)"></div><div class="token-swatch__info"><div class="token-swatch__name">feed-divider</div><div class="token-swatch__value">post separator</div></div></div>
              <div class="token-swatch" style="min-width:140px"><div class="token-swatch__color" style="background:var(--color-brand-primary)"></div><div class="token-swatch__info"><div class="token-swatch__name">brand-primary</div><div class="token-swatch__value">accent</div></div></div>
            </div>
            <p class="ds-section__description" style="margin-top:var(--space-3)">Toggle the floating theme control. Feed chrome uses <code>html[data-feed-theme]</code> with a <code>.feed-path-shell</code> ancestor.</p>"""

THEME_MARKUP = """<!-- Set on <html> -->
<html lang="en" data-feed-theme="dark">
  <body>
    <div class="feed-path-shell">
      <!-- feed app -->
    </div>
  </body>
</html>

/* Light mode */
<html data-feed-theme="light">…</html>"""


def build_index() -> str:
    return f"""<!DOCTYPE html>
<html lang="en" data-feed-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Platform Design System — InrCliq Feed</title>
  <link rel="stylesheet" href="css/main.css" />
  <link rel="stylesheet" href="css/showcase.css" />
  <link rel="stylesheet" href="css/platform-showcase.css" />
</head>
<body>
  <div class="ds-layout">
    <aside class="ds-sidebar">
      <div class="ds-sidebar__brand">
        <a href="index.html"><h1>DS / Platform</h1></a>
        <p>Feed landing · v1.0</p>
      </div>
      <nav>
        <div class="ds-nav__group">
          <div class="ds-nav__label">Foundation</div>
          <a href="#colors" class="ds-nav__link">Colors</a>
          <a href="#feed-tokens" class="ds-nav__link">Feed Tokens</a>
          <a href="#typography" class="ds-nav__link">Typography</a>
          <a href="#spacing" class="ds-nav__link">Spacing</a>
          <a href="#radius" class="ds-nav__link">Border Radius</a>
          <a href="#layout" class="ds-nav__link">Layout Tokens</a>
          <a href="#themes" class="ds-nav__link">Themes</a>
        </div>
        <div class="ds-nav__group">
          <div class="ds-nav__label">Components</div>
          <a href="#buttons" class="ds-nav__link">Buttons</a>
          <a href="#left-nav" class="ds-nav__link">Left Nav</a>
          <a href="#mobile-nav" class="ds-nav__link">Mobile Nav</a>
          <a href="#stories" class="ds-nav__link">Stories</a>
          <a href="#filters" class="ds-nav__link">Greeting &amp; Filters</a>
          <a href="#post" class="ds-nav__link">Feed Post</a>
          <a href="#follow" class="ds-nav__link">Follow Button</a>
          <a href="#snaps" class="ds-nav__link">Snaps Rail</a>
          <a href="#top-creators" class="ds-nav__link">Top Creators</a>
          <a href="#right-rail" class="ds-nav__link">Right Rail</a>
          <a href="#loading" class="ds-nav__link">Loading</a>
        </div>
        <div class="ds-nav__group">
          <div class="ds-nav__label">Sample Pages</div>
          <a href="pages/feed/home.html" class="ds-nav__link" target="_blank" rel="noopener noreferrer">Home feed</a>
          <a href="#sample-pages" class="ds-nav__link">All sample pages</a>
        </div>
      </nav>
    </aside>

    <main class="ds-main">
      <section class="ds-section" id="intro">
        <div class="ds-section__header">
          <h1 class="ds-section__title" style="font-size:var(--font-size-3xl)">Platform Design System</h1>
          <p class="ds-section__description">
            Tokens and components for the InrCliq <strong>feed landing</strong> (<code>/feed</code>) —
            shell chrome, stories, filters, posts, and rails. Uses the same CSS classes as
            <code>src/components/feed</code> and <code>src/styles/feed</code>.
          </p>
        </div>
      </section>

      <section class="ds-section" id="colors">
        <div class="ds-section__header">
          <h2 class="ds-section__title">Colors</h2>
          <p class="ds-section__description">Shared brand and semantic palette. Feed dark/light remaps these via <code>app-theme.css</code>.</p>
        </div>
        <div class="ds-subsection">
          <h3 class="ds-subsection__title">Brand</h3>
          <div class="token-grid">
            <div class="token-swatch"><div class="token-swatch__color" style="background:var(--color-brand-primary)"></div><div class="token-swatch__info"><div class="token-swatch__name">brand-primary</div><div class="token-swatch__value">theme accent</div></div></div>
            <div class="token-swatch"><div class="token-swatch__color" style="background:var(--color-brand-primary-hover)"></div><div class="token-swatch__info"><div class="token-swatch__name">brand-primary-hover</div><div class="token-swatch__value">hover</div></div></div>
            <div class="token-swatch"><div class="token-swatch__color" style="background:var(--color-brand-primary-subtle)"></div><div class="token-swatch__info"><div class="token-swatch__name">brand-primary-subtle</div><div class="token-swatch__value">selected / chip</div></div></div>
          </div>
        </div>
        <div class="ds-subsection">
          <h3 class="ds-subsection__title">Surfaces &amp; text</h3>
          <div class="token-grid">
            <div class="token-swatch"><div class="token-swatch__color" style="background:var(--color-bg-page);border:1px solid var(--color-border-default)"></div><div class="token-swatch__info"><div class="token-swatch__name">bg-page</div><div class="token-swatch__value">app background</div></div></div>
            <div class="token-swatch"><div class="token-swatch__color" style="background:var(--color-bg-subtle)"></div><div class="token-swatch__info"><div class="token-swatch__name">bg-subtle</div><div class="token-swatch__value">panels</div></div></div>
            <div class="token-swatch"><div class="token-swatch__color" style="background:var(--color-text-primary)"></div><div class="token-swatch__info"><div class="token-swatch__name">text-primary</div><div class="token-swatch__value">body / titles</div></div></div>
            <div class="token-swatch"><div class="token-swatch__color" style="background:var(--color-text-secondary)"></div><div class="token-swatch__info"><div class="token-swatch__name">text-secondary</div><div class="token-swatch__value">meta</div></div></div>
            <div class="token-swatch"><div class="token-swatch__color" style="background:var(--color-border-default)"></div><div class="token-swatch__info"><div class="token-swatch__name">border-default</div><div class="token-swatch__value">hairlines</div></div></div>
          </div>
        </div>
      </section>

      <section class="ds-section" id="feed-tokens">
        <div class="ds-section__header">
          <h2 class="ds-section__title">Feed Tokens</h2>
          <p class="ds-section__description">Feed-specific variables from <code>app-theme.css</code> — cards, dividers, shell widths, stories.</p>
        </div>
        <div class="ds-subsection">
          <h3 class="ds-subsection__title">Cards &amp; chrome</h3>
          <div class="token-grid">
            <div class="token-swatch"><div class="token-swatch__color" style="background:var(--feed-card-bg);border:1px solid var(--color-border-default)"></div><div class="token-swatch__info"><div class="token-swatch__name">feed-card-bg</div><div class="token-swatch__value">post surface</div></div></div>
            <div class="token-swatch"><div class="token-swatch__color" style="background:var(--feed-divider)"></div><div class="token-swatch__info"><div class="token-swatch__name">feed-divider</div><div class="token-swatch__value">between posts</div></div></div>
            <div class="token-swatch"><div class="token-swatch__color" style="background:var(--hairline)"></div><div class="token-swatch__info"><div class="token-swatch__name">hairline</div><div class="token-swatch__value">subtle border</div></div></div>
            <div class="token-swatch"><div class="token-swatch__color" style="background:var(--surface-hover)"></div><div class="token-swatch__info"><div class="token-swatch__name">surface-hover</div><div class="token-swatch__value">nav / row hover</div></div></div>
            <div class="token-swatch"><div class="token-swatch__color" style="background:var(--color-story-ring)"></div><div class="token-swatch__info"><div class="token-swatch__name">story-ring</div><div class="token-swatch__value">muted ring</div></div></div>
            <div class="token-swatch"><div class="token-swatch__color" style="background:var(--shimmer-mid)"></div><div class="token-swatch__info"><div class="token-swatch__name">shimmer-mid</div><div class="token-swatch__value">loading</div></div></div>
          </div>
        </div>
        <table class="token-table">
          <thead><tr><th>Token</th><th>Typical value</th><th>Usage</th></tr></thead>
          <tbody>
            <tr><td><code>--nav-width</code></td><td>245px</td><td>Left sidebar</td></tr>
            <tr><td><code>--feed-width</code></td><td>720px</td><td>Main feed column</td></tr>
            <tr><td><code>--right-rail-width</code></td><td>280px</td><td>Suggested / trending</td></tr>
            <tr><td><code>--feed-card-radius</code></td><td>12px / radius-md</td><td>Card rounding</td></tr>
            <tr><td><code>--feed-card-gap</code></td><td>1rem</td><td>Stack gap</td></tr>
          </tbody>
        </table>
      </section>

      <section class="ds-section" id="typography">
        <div class="ds-section__header">
          <h2 class="ds-section__title">Typography</h2>
          <p class="ds-section__description">Plus Jakarta Sans — same family as auth and feed.</p>
        </div>
        <div class="ds-demo">
          <div class="typography-demo">
            <div class="typography-row"><span class="typography-row__meta">2xl</span><span style="font-size:var(--font-size-2xl);font-weight:var(--font-weight-bold)">Good morning, Hiran</span></div>
            <div class="typography-row"><span class="typography-row__meta">lg</span><span style="font-size:var(--font-size-lg);font-weight:var(--font-weight-semibold)">Suggested</span></div>
            <div class="typography-row"><span class="typography-row__meta">md</span><span style="font-size:var(--font-size-md)">New stage moments from the weekend show.</span></div>
            <div class="typography-row"><span class="typography-row__meta">sm</span><span style="font-size:var(--font-size-sm);color:var(--color-text-secondary)">@bathiya · 2h</span></div>
          </div>
        </div>
      </section>

      <section class="ds-section" id="spacing">
        <div class="ds-section__header">
          <h2 class="ds-section__title">Spacing</h2>
          <p class="ds-section__description">4px-based scale shared with the rest of the product.</p>
        </div>
        <div class="ds-demo">
          <div class="spacing-demo">
            <div class="spacing-block"><div class="spacing-block__visual" style="width:var(--space-2);height:32px"></div><span class="spacing-block__label">space-2</span></div>
            <div class="spacing-block"><div class="spacing-block__visual" style="width:var(--space-3);height:32px"></div><span class="spacing-block__label">space-3</span></div>
            <div class="spacing-block"><div class="spacing-block__visual" style="width:var(--space-4);height:32px"></div><span class="spacing-block__label">space-4</span></div>
            <div class="spacing-block"><div class="spacing-block__visual" style="width:var(--space-6);height:32px"></div><span class="spacing-block__label">space-6</span></div>
            <div class="spacing-block"><div class="spacing-block__visual" style="width:var(--space-8);height:32px"></div><span class="spacing-block__label">space-8</span></div>
          </div>
        </div>
      </section>

      <section class="ds-section" id="radius">
        <div class="ds-section__header">
          <h2 class="ds-section__title">Border Radius</h2>
          <p class="ds-section__description">Cards and chips lean on medium/large radii; avatars use full.</p>
        </div>
        <div class="ds-demo radius-demo">
          <div class="radius-box" style="border-radius:var(--radius-sm)">sm</div>
          <div class="radius-box" style="border-radius:var(--radius-md)">md</div>
          <div class="radius-box" style="border-radius:var(--radius-lg)">lg</div>
          <div class="radius-box" style="border-radius:var(--radius-full)">full</div>
        </div>
      </section>

      <section class="ds-section" id="layout">
        <div class="ds-section__header">
          <h2 class="ds-section__title">Layout Tokens</h2>
          <p class="ds-section__description">Structural widths for the three-column feed shell.</p>
        </div>
        <table class="token-table">
          <thead><tr><th>Token</th><th>Value</th><th>Usage</th></tr></thead>
          <tbody>
            <tr><td><code>--nav-width</code></td><td>245px</td><td><code>.left-nav</code></td></tr>
            <tr><td><code>--feed-width</code></td><td>720px</td><td><code>.feed-main</code> / post column</td></tr>
            <tr><td><code>--right-rail-width</code></td><td>280px</td><td><code>.right-rail</code></td></tr>
            <tr><td><code>.app-shell</code></td><td>—</td><td>Desktop 3-column frame</td></tr>
            <tr><td><code>.page-home</code></td><td>—</td><td>Body class for <code>/feed</code></td></tr>
          </tbody>
        </table>
      </section>

      <section class="ds-section" id="themes">
        <div class="ds-section__header">
          <h2 class="ds-section__title">Themes</h2>
          <p class="ds-section__description">Dark is the feed default. Light is opt-in via <code>data-feed-theme="light"</code>.</p>
        </div>
{subsection("Theme switch", THEME_DEMO, THEME_MARKUP, "ds-demo ds-demo--has-markup")}
      </section>

      <section class="ds-section" id="buttons">
        <div class="ds-section__header">
          <h2 class="ds-section__title">Buttons</h2>
          <p class="ds-section__description">Shared button primitives used in nav promo, create, and feed CTAs.</p>
        </div>
{subsection("Variants", BUTTONS_DEMO, BUTTONS_MARKUP)}
      </section>

      <section class="ds-section" id="left-nav">
        <div class="ds-section__header">
          <h2 class="ds-section__title">Left Nav</h2>
          <p class="ds-section__description">Desktop sidebar — brand, primary destinations, premium promo, create, profile.</p>
        </div>
{subsection("Structure", LEFT_NAV_DEMO, LEFT_NAV_MARKUP)}
      </section>

      <section class="ds-section" id="mobile-nav">
        <div class="ds-section__header">
          <h2 class="ds-section__title">Mobile Nav</h2>
          <p class="ds-section__description">Bottom bar for small screens, with a More sheet for secondary destinations.</p>
        </div>
{subsection("Bar", MOBILE_NAV_DEMO, MOBILE_NAV_MARKUP)}
      </section>

{build_stories_section()}

      <section class="ds-section" id="filters">
        <div class="ds-section__header">
          <h2 class="ds-section__title">Greeting &amp; Filters</h2>
          <p class="ds-section__description"><code>spotify-landing</code> greeting plus collapsible category tabs.</p>
        </div>
{subsection("Landing header", FILTERS_DEMO, FILTERS_MARKUP)}
      </section>

      <section class="ds-section" id="post">
        <div class="ds-section__header">
          <h2 class="ds-section__title">Feed Post</h2>
          <p class="ds-section__description">Simple post card — author head, tags, caption, media, engagement actions.</p>
        </div>
{subsection("Simple post", POST_DEMO, POST_MARKUP)}
{subsection("Action states", POST_ACTIONS_DEMO, POST_ACTIONS_MARKUP)}
      </section>

      <section class="ds-section" id="follow">
        <div class="ds-section__header">
          <h2 class="ds-section__title">Follow Button</h2>
          <p class="ds-section__description">Follow / Following control used on posts and the suggested rail.</p>
        </div>
{subsection("States", FOLLOW_DEMO, FOLLOW_MARKUP)}
      </section>

      <section class="ds-section" id="snaps">
        <div class="ds-section__header">
          <h2 class="ds-section__title">Snaps Rail</h2>
          <p class="ds-section__description">In-feed recommendation grid (<code>.snaps-rail</code>) — separate from the stories bar. Tile anatomy: cover, play overlay, duration, views, creator.</p>
        </div>
{subsection("Grid", SNAPS_DEMO, SNAPS_MARKUP)}
      </section>

      <section class="ds-section" id="top-creators">
        <div class="ds-section__header">
          <h2 class="ds-section__title">Top Creators</h2>
          <p class="ds-section__description">Horizontal creator cards injected into the home feed (<code>.audio-top-creators</code>).</p>
        </div>
{subsection("Creator row", CREATORS_DEMO, CREATORS_MARKUP)}
      </section>

      <section class="ds-section" id="right-rail">
        <div class="ds-section__header">
          <h2 class="ds-section__title">Right Rail</h2>
          <p class="ds-section__description">Suggested people and trending topics beside the main feed.</p>
        </div>
{subsection("Widgets", RAIL_DEMO, RAIL_MARKUP)}
      </section>

      <section class="ds-section" id="loading">
        <div class="ds-section__header">
          <h2 class="ds-section__title">Loading</h2>
          <p class="ds-section__description">Shimmer skeleton shown while filters change or the next page loads.</p>
        </div>
{subsection("Skeleton", LOADING_DEMO, LOADING_MARKUP)}
      </section>

      <section class="ds-section" id="sample-pages">
        <div class="ds-section__header">
          <h2 class="ds-section__title">Sample Pages</h2>
          <p class="ds-section__description">Composed pages built with this design system.</p>
        </div>
        <div class="sample-grid">
          <a href="pages/feed/home.html" class="sample-card" target="_blank" rel="noopener noreferrer">
            <div class="sample-card__title">Home feed</div>
            <p class="sample-card__desc">Static composition of the /feed landing shell — nav, stories, filters, posts, and rail.</p>
          </a>
        </div>
      </section>
    </main>
  </div>

  <button type="button" class="btn btn--secondary theme-toggle" id="theme-toggle">Toggle Light Mode</button>
  <script src="js/platform.js"></script>
</body>
</html>
"""


HOME_PAGE = """<!DOCTYPE html>
<html lang="en" data-feed-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Home feed — Platform DS</title>
  <link rel="stylesheet" href="../../css/main.css" />
  <link rel="stylesheet" href="../../css/platform-showcase.css" />
</head>
<body class="page-home">
  <div class="feed-path-shell">
    <div class="app-shell page-home">
      <aside class="left-nav">
        <div class="left-nav__body">
          <div class="left-nav__header">
            <div class="brand"><a href="../../index.html" style="color:inherit;text-decoration:none">INRCLIQ<span class="dot">.</span></a></div>
          </div>
          <nav>
            <a class="nav-item active" href="#"><span class="nav-item__label"><span class="nav-item__text">Home</span></span></a>
            <a class="nav-item" href="#"><span class="nav-item__label"><span class="nav-item__text">Messages</span></span></a>
            <a class="nav-item" href="#"><span class="nav-item__label"><span class="nav-item__text">Audio</span></span></a>
            <a class="nav-item" href="#"><span class="nav-item__label"><span class="nav-item__text">Bookings</span></span></a>
          </nav>
        </div>
        <div class="nav-create"><button type="button" class="nav-create__btn">Create</button></div>
      </aside>

      <div class="main-content">
        <header class="feed-header" id="feed-top">
          <section class="stories-bar" aria-label="Stories">
            <div class="stories"><div class="stories-track">
              <a class="story story--snap" href="#"><div class="story-avatar-ring story-avatar-ring--muted"><div class="story-avatar story-avatar--snap">+</div></div><span>Your Snap</span></a>
              <a class="story" href="#"><div class="story-avatar-ring story-avatar-ring--gradient"><div class="story-avatar" style="--story-color:#4f46e5">T</div></div><span>Taylor</span></a>
              <a class="story" href="#"><div class="story-avatar-ring story-avatar-ring--gradient"><div class="story-avatar" style="--story-color:#a21caf">B</div></div><span>Bruno</span></a>
              <a class="story" href="#"><div class="story-avatar-ring story-avatar-ring--muted"><div class="story-avatar" style="--story-color:#0f766e">BE</div></div><span>Billie</span></a>
            </div></div>
          </section>
        </header>

        <div class="content-layout">
          <div class="content-row">
            <div class="feed-main feed-surface feed-surface--simple">
              <section class="feed-filters feed-filters--audio feed-filters--collapsible feed-filters--in-feed feed-landing is-expanded" aria-label="Feed categories">
                <div class="feed-landing__header">
                  <section class="spotify-landing">
                    <div class="spotify-landing__greeting-row">
                      <span class="spotify-landing__avatar spotify-landing__avatar--live" style="--story-color:#0d9488">YO</span>
                      <h1 class="spotify-landing__greeting">Good morning</h1>
                    </div>
                  </section>
                </div>
                <div class="feed-filters__pills-wrap">
                  <div class="feed-filters__track feed-filters__track--audio" role="tablist">
                    <span class="feed-filter-item is-active"><button type="button" class="feed-filter" role="tab" aria-selected="true">All</button></span>
                    <span class="feed-filter-item"><button type="button" class="feed-filter" role="tab">Music</button></span>
                    <span class="feed-filter-item"><button type="button" class="feed-filter" role="tab">Discovery</button></span>
                  </div>
                </div>
              </section>

              <article class="post post--simple">
                <div class="post-head">
                  <div class="post-head__author">
                    <div class="post-head__avatar" style="--story-color:#1241a6"><img src="../../assets/creators/avatar.jpg" alt="" /></div>
                    <div class="post-head__identity">
                      <div class="post-head__name-row">
                        <strong class="post-head__name">Bathiya &amp; Santhush</strong>
                        <button type="button" class="follow-btn post-head__follow">Follow</button>
                      </div>
                      <div class="post-head__meta-line">
                        <span class="post-head__handle">@bathiya</span>
                        <span class="post-head__meta-dot">·</span>
                        <time class="post-head__time">2h</time>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="post__body">
                  <div class="post-tags"><span class="tag">Music</span></div>
                  <p>New stage moments from the weekend show.</p>
                  <div class="post-media"><img src="../../assets/creators/feed.jpg" alt="Live performance" /></div>
                </div>
                <div class="post-footer">
                  <div class="post-actions post-actions--engage">
                    <button type="button" class="post-action post-action--like" aria-label="Like"><span class="post-action__count">12.4K</span></button>
                    <button type="button" class="post-action post-action--comment" aria-label="Comment"><span class="post-action__count">864</span></button>
                  </div>
                </div>
              </article>
            </div>

            <aside class="right-rail">
              <section class="rail-widget">
                <div class="rail-widget__head"><h3>Suggested</h3><a class="rail-widget__link" href="#">See all</a></div>
                <ul class="suggest-list">
                  <li class="suggest-item">
                    <div class="suggest-item__av" style="--story-color:#8b5cf6">JL</div>
                    <div class="suggest-item__body"><span class="suggest-item__name">Jennifer Lopez</span><span class="suggest-item__meta">48.2M followers</span></div>
                    <button type="button" class="follow-btn suggest-item__btn">Follow</button>
                  </li>
                </ul>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  </div>
  <p style="position:fixed;bottom:12px;right:12px;z-index:50;margin:0">
    <a href="../../index.html" class="btn btn--secondary btn--sm">← Design system</a>
  </p>
</body>
</html>
"""

PLATFORM_JS = r"""(function () {
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
"""

PLATFORM_CSS = """
/* Platform DS — feed demo frames inside the docs layout */

.ds-feed-frame {
  border-radius: var(--radius-lg);
  overflow: auto;
  background: var(--color-bg-page);
  color: var(--color-text-primary);
}

.ds-feed-frame__nav.left-nav,
.ds-feed-frame .left-nav {
  position: relative;
  height: 420px;
  width: var(--nav-width, 245px);
  flex-shrink: 0;
}

.ds-mobile-nav-demo.mobile-nav,
.ds-feed-frame .mobile-nav.ds-mobile-nav-demo {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  position: relative;
  bottom: auto;
  left: auto;
  right: auto;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-default);
  background: var(--color-neutral-0);
  box-shadow: var(--shadow-md);
}

.ds-feed-frame .right-rail {
  position: relative;
  top: auto;
  height: auto;
}

/* Ensure feed theme tokens resolve inside docs demos */
.ds-layout .feed-path-shell,
.ds-layout .ds-feed-frame.feed-path-shell {
  display: block;
  /* Demo frames only need content height — app shells use 100dvh */
  min-height: 0;
}

.ds-layout .ds-feed-frame {
  min-height: 0;
}

html[data-feed-theme="dark"] .ds-layout .feed-path-shell,
html:not([data-feed-theme="light"]) .ds-layout .feed-path-shell {
  color-scheme: dark;
}

/* Stories state docs */

.ds-subsection__note {
  margin: 0 0 var(--space-4);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.45;
}

.ds-state-label {
  margin: 0 0 var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.45;
}

.ds-state-label code {
  font-size: 0.85em;
}

.ds-story-state__track {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  overflow: visible;
  width: auto;
}

.ds-story-matrix {
  --story-ring-size: 60px;
  --story-item-pad-top: 0.25rem;
  --story-track-pad-top: 5px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-6) var(--space-4);
  padding: var(--space-5);
}

@media (max-width: 900px) {
  .ds-story-matrix {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .ds-story-matrix {
    grid-template-columns: 1fr;
  }
}

.ds-story-matrix__cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  text-align: center;
}

.ds-story-matrix__caption {
  display: block;
  width: 100%;
  min-height: 2.4em;
  text-align: center;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.25;
  color: var(--color-text-secondary);
}

.ds-story-matrix__cell .stories {
  width: auto;
  display: flex;
  justify-content: center;
}

.ds-story-matrix__cell .stories-track {
  justify-content: center;
  width: auto;
  overflow: visible;
  padding-top: var(--story-track-pad-top);
}

.ds-demo--stack {
  display: flex;
  flex-direction: column;
}

.ds-state-pair {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.ds-state-pair .post-actions {
  padding: 0;
}

/* Collapsed stories preview inside docs (avoid zero-height demos) */
.ds-feed-frame .feed-header.is-stories-collapsed .stories-bar {
  opacity: 0.45;
  transform: translateY(-0.35rem) scale(0.96);
  transform-origin: top center;
  pointer-events: none;
  max-height: 4.5rem;
  overflow: hidden;
}
"""


def main() -> None:
    (ROOT / "index.html").write_text(build_index(), encoding="utf-8")
    # Home sample is maintained by _build_home.py (full /feed composition)
    home_builder = ROOT / "_build_home.py"
    if home_builder.exists():
        import runpy

        runpy.run_path(str(home_builder))
    (ROOT / "js" / "platform.js").write_text(PLATFORM_JS, encoding="utf-8")
    (ROOT / "css" / "platform-showcase.css").write_text(PLATFORM_CSS, encoding="utf-8")
    print("Wrote index.html, js/platform.js, css/platform-showcase.css")


if __name__ == "__main__":
    main()
