# InrCliq platform design system — feed landing

Static HTML design system for the **feed landing page** (`/feed`) and its chrome: left nav, stories, greeting/filters, posts, follow controls, and right rail.

This is separate from the auth/onboarding design system in `../design-system/`.

## Preview

From the repository root:

```bash
npx serve design-system-platform -p 3011
```

Open http://localhost:3011 — the design system is the entry page. Sample home feed: [pages/feed/home.html](pages/feed/home.html).

## What’s included

| Area | Coverage |
|------|----------|
| Foundation | Colors, feed tokens, typography, spacing, radius, layout widths, dark/light themes |
| Components | Buttons, left nav, mobile nav, stories, greeting & filters, feed post, follow button, right rail, loading skeleton |
| Markup | HTML / Next.js switch + copy on each component demo |
| Sample | Composed home feed page |

## CSS

Bundled via `css/main.css`:

1. Foundation (fonts → tokens → app-theme → base → layout → components → overrides → responsive)
2. Feed landing subset in `css/feed/feed-landing.css` (theme, shell, buttons, follow, home, spotify, simple/fb post, audio chrome, mobile)

Source of truth for production styles remains `src/styles/` and `src/styles/feed/`.

## Regenerating the docs page

```bash
python design-system-platform/_generate.py
```

## Related

- Auth / onboarding DS: `../design-system/` (port 3010)
- App route: `/feed` → `src/app/feed/page.tsx` + `src/components/feed/HomeFeed.tsx`
