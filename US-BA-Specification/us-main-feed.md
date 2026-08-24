# Main Feed — User Stories & Acceptance Criteria

| Document | `us-main-feed.md` |
| --- | --- |
| Module | Main Feed (INRCLIQ · Live Feed) |
| Based on | Current product implementation in `src/` (as of 2026-08-24) |
| Actors | Member (authenticated fan), Creator, Verified creator, Guest |
| Primary surfaces | Home stream, Profiles, Create post, Collections, Messages, Audio, Calendar entry, Seller Tools entry |
| Related spec | Service Requests / Bookings → `us-service-requests.md` |

---

## 1. Purpose

This specification captures **user stories and acceptance criteria** for the Main Feed as implemented today: an authenticated social and commerce surface where members browse posts, follow and subscribe to creators, open profiles and storefronts, create posts, message peers, browse audio discovery, and enter Calendar (Service Requests) and Seller Tools.

Stories reflect **current behaviour**. Known gaps and placeholders are listed in [§8 Out of scope / known gaps](#8-out-of-scope--known-gaps-relative-to-current-code).

**Out of depth here:** full Service Request lifecycle (accept / counter-offer / deliver / feedback). Feed only documents **entry points** into that module; see `us-service-requests.md`.

---

## 2. Actors

| Actor | Description |
| --- | --- |
| **Guest** | Unauthenticated visitor. Cannot access `/feed/*` (middleware redirects to `/`). |
| **Member** | Authenticated `User` with session. Uses Home, Messages, Profiles, Collections, Create, Audio, Calendar as requester. |
| **Creator** | Member with a linked `CreatorUser` / `UserProfile` (may be stub-provisioned on first post). Authors content and may sell collections. |
| **Verified creator** | Creator with verified profile. Can mark posts members-only, receive inbound Special Requests / Commitments, and use Seller Tools more fully. |
| **Own-profile viewer** | Signed-in user viewing `/feed/me` or their own public profile (`is_own`). Sees first-post / share prompts and own social tabs. |

---

## 3. Product shell & access

### Auth & entry

| Rule | Behaviour |
| --- | --- |
| Session required | Middleware requires `inrcliq_session` for `/feed`, `/home`, `/seller`, `/onboarding`. |
| No session | Redirect to `/`. |
| Legacy home | `/home` redirects into feed (or onboarding if incomplete). |
| Onboarding complete | Redirects to `/feed`. |
| Base path | `FEED_BASE = "/feed"` (`src/lib/feed/paths.ts`). |

### Layout chrome

| Element | Behaviour |
| --- | --- |
| Desktop left nav | Persistent `LeftNav` with primary destinations, Create, profile menu, theme, logout, messages unread badge. |
| Mobile bottom nav | Home, Snaps, Photos, Videos, Audio, More. |
| Mobile More sheet | Messages, Explore, Purchases, Calendar, Seller Tools, Settings, Profile, Theme, Logout. |
| Right rail | Home only: suggested creators / trending (static demo content). |
| Theme | Light / dark via `FeedThemeProvider`; preference in localStorage (`inrcliq-feed-theme`); feed default dark. |
| Page body classes | `page-home`, `page-profile`, `page-audio`, `page-messages`, `page-bookings` via `FeedPathShell`. |

### Navigation map (current)

| Label | Href | Status |
| --- | --- | --- |
| Home | `/feed` | Implemented |
| Messages | `/feed/messages` | Implemented |
| Snaps | `#` | Stub |
| Photos | `#` | Stub |
| Videos | `#` | Stub |
| Audio | `/feed/audio` | Implemented (static catalog) |
| Explore | `#` | Stub |
| Purchases | `#` | Stub |
| Calendar | `/feed/bookings` | Implemented (see SR spec) |
| Seller Tools | `/seller` | Implemented (seller surface) |
| Settings | `/settings` | Via mobile More |
| Profile | `/feed/me` | Implemented |
| Create | Modal (not a route) | Implemented |
| Notifications | `#` | Stub (decorative unread) |

---

## 4. Route inventory

| Route | Surface |
| --- | --- |
| `/feed` | Home content stream |
| `/feed/audio` | Audio discovery landing |
| `/feed/messages` | Chat inbox (+ query deep links) |
| `/feed/bookings` | Calendar / Service Requests hub |
| `/feed/bookings/[id]/deliver` | Provider delivery (SR) |
| `/feed/bookings/[id]/balance` | Requester balance checkout (SR) |
| `/feed/me` | Own account social hub (`?tab=followers\|following\|subscriptions`) |
| `/feed/me/edit` | Own profile info (display-only fields) |
| `/feed/profile/[slug]` | Public profile |
| `/feed/profile/[slug]/collection` | Collection storefront |
| `/feed/profile/[slug]/collection/[productId]` | Product detail |
| `/feed/profile/[slug]/collection/checkout` | Collection checkout (simulated) |
| `/feed/profile/[slug]/requests` | Special Requests catalog |
| `/feed/profile/[slug]/requests/choose` | Request choose |
| `/feed/profile/[slug]/requests/checkout` | Request checkout |

---

## 5. Epics & user stories

### Epic A — Access & shell

#### US-FEED-A01 — Enter the authenticated feed

**As a** member  
**I want to** open the Live Feed after signing in  
**So that** I can use the social/commerce home surface.

**Acceptance criteria**

1. Authenticated users can open `/feed` and see the feed layout (nav + main column).
2. Unauthenticated requests to `/feed/*` redirect to `/`.
3. Completing onboarding lands the user on `/feed`.
4. `/home` routes members into the feed experience (or onboarding when incomplete).
5. Layout metadata brands the surface as INRCLIQ Live Feed.

---

#### US-FEED-A02 — Navigate the feed chrome

**As a** member  
**I want** desktop and mobile navigation to the main feed destinations  
**So that** I can move between Home, Messages, Audio, Calendar, Profile, and Seller Tools.

**Acceptance criteria**

1. Desktop left nav exposes Home, Messages, Audio, Calendar, Seller Tools, Create, and Profile.
2. Stub destinations (Snaps, Photos, Videos, Explore, Purchases, Notifications) render in the nav but do not navigate to a real page (`href="#"`).
3. Mobile bottom nav shows Home, Snaps, Photos, Videos, Audio, and More.
4. Mobile More opens a sheet with Messages, Calendar, Seller Tools, Settings, Profile, Theme, and Logout (plus stub Explore / Purchases).
5. Active route highlighting works for real destinations; stubs never appear “active.”
6. Messages nav shows an unread badge sourced from `GET /api/feed/messages` when available.

---

#### US-FEED-A03 — Switch theme and sign out

**As a** member  
**I want to** toggle light/dark theme and log out from the feed chrome  
**So that** I can control presentation and end my session.

**Acceptance criteria**

1. Theme toggle updates the feed theme and persists preference locally.
2. Logout calls `POST /api/auth/logout` and redirects to the returned URL (typically `/`).
3. Theme and logout are available from left-nav profile menu and mobile More.

---

### Epic B — Home content stream

#### US-FEED-B01 — Browse the home feed

**As a** member  
**I want to** scroll a stream of creator posts on Home  
**So that** I can see what creators are publishing.

**Acceptance criteria**

1. `/feed` loads posts via server-side `getFeedData()` into `HomeFeed`.
2. Data preference: Prisma `FeedPost` + `CreatorUser`; if empty/unavailable, fall back to seeded JSON (`data/my_feed.json`).
3. Each post shows author identity, text, tags, media/audio when present, engagement counts, and relative time.
4. Follow / subscription relationship overlays apply for the signed-in session where resolved.
5. Members-only posts show locked media until the viewer is subscribed to that creator (per relationship data).
6. Client infinite scroll loads additional items in batches (client-side pagination of the loaded set; not a separate server page API).

---

#### US-FEED-B02 — Filter posts by category

**As a** member  
**I want to** filter the home stream by category chips  
**So that** I can focus on a content type.

**Acceptance criteria**

1. Category filter chips appear on Home from feed category metadata.
2. Selecting a category filters the visible stream on the client.
3. Filter changes may show a brief loading state before applying results.

---

#### US-FEED-B03 — Engage with a post (current UI)

**As a** member  
**I want to** react, comment, share, and play media on a post  
**So that** I can interact with content in-place.

**Acceptance criteria**

1. Reaction, comment, and share controls are visible on posts.
2. Comment UI may use sample comments; **reactions / comments / shares are not persisted to the server** in the current build.
3. Image and video viewers open in-feed; video may use a sample stream URL when a post lacks a real `video_url`.
4. Audio posts play via the feed audio player / mini player / fullscreen player stack.
5. Follow control on a post updates follow state when wired with a creator slug; otherwise it may toggle locally only.

---

#### US-FEED-B04 — Use home supporting rails

**As a** member  
**I want** stories, snaps, suggested creators, and audio highlights around the stream  
**So that** discovery surfaces feel populated.

**Acceptance criteria**

1. Stories bar and Snaps rail render on Home when present in the UI composition.
2. Stories / Snaps content is **static / decorative** (seed or hardcoded assets; links may be `#`).
3. Right rail shows Suggested / Trending blocks with demo creators; Follow there may be local-only unless a creator slug is provided.
4. Creators rail may be feature-flagged off in current code (`SHOW_CREATORS_RAIL`).
5. Audio top creators / landing-style embeds can appear on Home as configured.

---

### Epic C — Create content

#### US-FEED-C01 — Create a post from the feed

**As a** creator / member  
**I want to** compose and publish a post from Create  
**So that** my content appears in the feed and on my profile.

**Acceptance criteria**

1. Create opens a composer modal from left nav (and from empty own-profile / first-post prompts when shown).
2. Composer supports text and optional: images, video, GIF, feeling/activity, location, tagged people.
3. Images can be edited in-composer (`ComposerImageEditor`) before upload.
4. Media uploads go through `POST /api/feed/uploads` (image ≤ 8MB, video ≤ 25MB) and store under `/uploads/feed-posts/…`.
5. GIFs load from `GET /api/feed/gifs`; people tags from `GET /api/feed/people`.
6. Publish calls `POST /api/feed/posts` and creates a `FeedPost` (category forced to personal where implemented).
7. Verified creators can mark a post **members-only**.
8. First publish may provision stub `CreatorUser` / `UserProfile` via the creator-user bridge and pin content on the profile as implemented.
9. There is **no** edit/delete post API in the current build.

---

#### US-FEED-C02 — Complete first-post / share prompts

**As a** new own-profile viewer  
**I want** guided prompts to publish my first post and share my profile  
**So that** I start contributing content.

**Acceptance criteria**

1. Empty own profile / first-run surfaces may show `FirstPostPrompt` opening Create.
2. Share-on-social prompt may encourage sharing the profile after posting (UI prompt; not a full social-graph product).

---

### Epic D — Profiles & social graph

#### US-FEED-D01 — View a public profile

**As a** member  
**I want to** open a creator or member public profile by slug  
**So that** I can see their bio, posts, and commerce entry points.

**Acceptance criteria**

1. `/feed/profile/[slug]` loads profile header, popular/posts, and collection / Special Requests controls when enabled.
2. Profile data resolves from DB (`UserProfile` / `CreatorUser` / `FeedPost`) with JSON seed fallbacks for known demo creators; stubs may appear for newly provisioned profiles.
3. Header shows identity, verification badge when verified, and relationship state (follow / subscribe).
4. Header actions include Follow, Subscribe (with notify level where implemented), Message (`/feed/messages?slug=…`), Collection, and Special Requests entry when catalog is live.
5. Unavailable Collection / Special Requests show clear unavailable states with Message as a fallback path.

---

#### US-FEED-D02 — Follow a creator

**As a** member  
**I want to** follow or unfollow a creator  
**So that** my free follow relationship is stored.

**Acceptance criteria**

1. Follow / unfollow uses `GET|POST /api/feed/follows/[slug]`.
2. Follow state is reflected in feed relationship overlay and profile header when the creator slug is known.
3. Client follow context (`FeedFollowStateProvider`) keeps UI in sync across surfaces when used.

---

#### US-FEED-D03 — Subscribe to a creator

**As a** member  
**I want to** subscribe (and set notify preferences) for a creator  
**So that** I unlock members-only content for that creator.

**Acceptance criteria**

1. Subscribe / unsubscribe / notify-level updates use `GET|POST /api/feed/subscriptions/[slug]`.
2. Active subscription unlocks members-only media for that creator in the stream and profile posts.
3. Notify level persists on `CreatorSubscription.notifyLevel`.
4. There is **no** notification inbox delivery product yet; notify level is stored preference only.

---

#### US-FEED-D04 — Manage own account profile

**As a** member  
**I want to** view my account hub and profile info  
**So that** I can see followers, following, subscriptions, and my details.

**Acceptance criteria**

1. `/feed/me` shows social tabs: Followers, Following, Subscriptions (default tab as implemented).
2. Avatar upload is available via `POST /api/feed/me/avatar` where exposed in UI.
3. `/feed/me/edit` shows account info fields in a **read-only** presentation (no save profile API in current build).
4. Missing own profile redirects away from `/feed/me*` as implemented (e.g. to `/`).
5. Banner edit affordance may appear for verified own profile only (UI-limited).

---

#### US-FEED-D05 — Message a creator from profile

**As a** member  
**I want to** open Messages pre-focused on a creator from their profile  
**So that** I can start or continue a conversation.

**Acceptance criteria**

1. Profile Message action navigates to `/feed/messages` with slug (and related query params as implemented).
2. Messages view opens or creates the appropriate peer thread for that creator.

---

### Epic E — Collections (storefront)

#### US-FEED-E01 — Browse a creator’s collection

**As a** member  
**I want to** open a creator’s collection listing and product detail  
**So that** I can shop digital/physical offerings.

**Acceptance criteria**

1. Collection listing at `/feed/profile/[slug]/collection` shows products from `CreatorCollection` / `CollectionProduct` (JSON fallback when needed).
2. Product detail at `…/collection/[productId]` shows product info and reviews UI.
3. Product reviews may be **generated** for display (`product-reviews.ts`); not a full user-review write path.
4. Cart drawer supports add/remove; cart persists in **localStorage**.

---

#### US-FEED-E02 — Check out a collection cart

**As a** member  
**I want to** complete collection checkout  
**So that** I can place an order for selected products.

**Acceptance criteria**

1. Checkout route `/feed/profile/[slug]/collection/checkout` summarizes cart and payment UI.
2. Placing an order succeeds in the **client/simulated** flow (`placeOrder`); there is **no** live payment or order persistence API in the current build.
3. Success state returns the member to a confirmation UI without creating a durable order record on the server.

---

### Epic F — Messages

#### US-FEED-F01 — Use the messages inbox

**As a** member  
**I want to** list conversations and open a thread  
**So that** I can chat with creators and peers.

**Acceptance criteria**

1. `/feed/messages` lists the signed-in user’s `ChatThread` rows (seeded defaults may apply via `chat-inbox-seed.json`).
2. Selecting a thread loads messages ordered by time; window opens scrolled to latest (or focused booking card when deep-linked).
3. Client search filters the conversation list.
4. Unread totals drive the left-nav badge.
5. Query params support deep links: `slug`, `thread`, `booking`, `focus=latest` (and related booking context).

---

#### US-FEED-F02 — Send a chat message (dual inbox)

**As a** member  
**I want** my outbound messages to appear for the peer  
**So that** both sides see the conversation without sharing a single thread id.

**Acceptance criteria**

1. Send uses `POST /api/feed/messages/[threadId]`.
2. System dual-writes / mirrors the message into the peer’s private thread (`mirrorChatMessageToPeer` pattern).
3. Thread preview and `lastMessageAt` update on send.
4. Messaging is request/response HTTP; **no WebSocket / realtime channel** in the current build.
5. Online indicators may come from seed data and are not a live presence system.

---

#### US-FEED-F03 — See booking cards and notes in chat

**As a** member  
**I want** Service Request confirmation cards and lifecycle notes in Messages  
**So that** booking activity is visible in conversation history.

**Acceptance criteria**

1. Booking confirmation cards and status notes render from structured message payloads.
2. Cards / notes can deep-link into Calendar with booking context.
3. Creating a booking from checkout posts confirmation into both parties’ inboxes (`POST /api/feed/messages/booking`).
4. Full booking lifecycle AC live in `us-service-requests.md`.

---

### Epic G — Audio discovery

#### US-FEED-G01 — Browse the audio landing

**As a** member  
**I want to** open Audio and browse music / podcasts / audiobooks dashboards  
**So that** I can discover audio content.

**Acceptance criteria**

1. `/feed/audio` renders the audio landing with spotlight, charts, and category dashboards.
2. Catalog content comes from static data (`data/feed/audio-landing.ts`), not a live audio CMS.
3. Players support play / pause / skip / fullscreen / dock behaviours in the audio UI stack.
4. “Live drops / rooms” style cards may appear as marketing UI without a real live-stream backend.

---

#### US-FEED-G02 — Play audio from the home stream

**As a** member  
**I want** audio posts on Home to play in a consistent player  
**So that** I can listen without leaving the feed.

**Acceptance criteria**

1. Audio posts use shared playback context / mini player / fullscreen player components.
2. Playback state can persist across feed scrolling within the session as implemented by the audio context.

---

### Epic H — Calendar & Seller entry points

#### US-FEED-H01 — Open Calendar from feed

**As a** member or verified creator  
**I want to** open Calendar from feed nav  
**So that** I can manage My Requests / Commitments / Billboard.

**Acceptance criteria**

1. Calendar nav item routes to `/feed/bookings`.
2. Profile Special Requests flows live under `/feed/profile/[slug]/requests*` and related `/requests` choose/checkout paths.
3. Behaviour of bookings, offers, delivery, refunds, and feedback is specified in `us-service-requests.md`.

---

#### US-FEED-H02 — Open Seller Tools from feed

**As a** creator  
**I want to** open Seller Tools from feed navigation  
**So that** I can manage storefront and service-request operations.

**Acceptance criteria**

1. Left nav and mobile More link to `/seller`.
2. Seller promo / Seller Tools entry is visible in desktop chrome as implemented.
3. Seller catalog, availability, and inbox details are owned by the Seller surface (cross-linked from feed).

---

## 6. Cross-cutting acceptance criteria

1. All `/feed/*` mutations require an authenticated session; unauthenticated callers receive 401 or redirect.
2. Feed pages are primarily React Server Components with client islands for interaction (composer, players, nav, messages UI).
3. Session chrome uses `FeedSessionProvider`; follow state may use `FeedFollowStateProvider`.
4. Uploads for posts and avatars write under `public/uploads/…` and are referenced as `/uploads/…` URLs.
5. Dual-inbox messaging is the source of truth for chat visibility between peers (no shared single thread id across users).
6. Members-only media gating depends on subscription relationship, not on client-only flags alone.
7. Stub nav destinations must not invent fake routes; they remain `#` until product implements them.
8. Demo / seed JSON may backfill empty DB states for feed, profiles, collections, chat, and audio without breaking the page.

---

## 7. API inventory (feed)

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/feed/posts` | Create post |
| `POST` | `/api/feed/uploads` | Upload post media |
| `GET` | `/api/feed/gifs` | Composer GIF search |
| `GET` | `/api/feed/people` | People search for tagging |
| `GET` / `POST` | `/api/feed/follows/[slug]` | Follow state |
| `GET` / `POST` | `/api/feed/subscriptions/[slug]` | Subscribe / notify / unsubscribe |
| `GET` | `/api/feed/messages` | Inbox list + unread total |
| `GET` / `POST` | `/api/feed/messages/[threadId]` | Read thread / send message |
| `POST` | `/api/feed/messages/booking` | Create booking + chat confirmation |
| `POST` | `/api/feed/me/avatar` | Upload avatar |
| `GET` | `/api/feed/profile/[slug]/availability` | Unavailable booking dates |
| `PATCH` | `/api/feed/bookings/[id]` | Booking actions (SR module) |
| `POST` | `/api/feed/bookings/uploads` | Booking attachment / delivery uploads (SR) |

There is **no** dedicated `GET /api/feed` stream endpoint; Home uses server-side `getFeedData()`.

---

## 8. Out of scope / known gaps (relative to current code)

These items are **not** accepted as delivered behaviour today; do not treat them as AC unless product later implements them.

| Gap | Notes |
| --- | --- |
| Guest / public feed browsing | `/feed` is auth-gated |
| Snaps / Photos / Videos destinations | Nav stubs (`#`) |
| Explore / discover product | Nav stub; no dedicated search/discover page |
| Purchases history | Nav stub |
| Notifications inbox | Bell is decorative; notifyLevel stored only |
| Live streaming | Labels / cards only; no broadcast stack |
| Server-persisted reactions / comments / shares | Client / sample only |
| Post edit / delete | Not implemented |
| Profile info save on `/feed/me/edit` | Display-only |
| Collection order + payment persistence | Client `placeOrder` simulation; cart in localStorage |
| Realtime messaging | HTTP only; no WebSocket |
| Stories / Snaps as real ephemeral product | Static tiles |
| Audio CMS / licensing catalog | Static `audio-landing` data |
| Right-rail personalization | Hardcoded suggestions |
| Server-paginated home feed API | Client slices SSR payload |

---

## 9. Story ID index

| ID | Title | Primary actor |
| --- | --- | --- |
| US-FEED-A01 | Enter authenticated feed | Member |
| US-FEED-A02 | Navigate feed chrome | Member |
| US-FEED-A03 | Theme and logout | Member |
| US-FEED-B01 | Browse home feed | Member |
| US-FEED-B02 | Filter posts by category | Member |
| US-FEED-B03 | Engage with a post (UI) | Member |
| US-FEED-B04 | Home supporting rails | Member |
| US-FEED-C01 | Create a post | Member / Creator |
| US-FEED-C02 | First-post / share prompts | Own-profile viewer |
| US-FEED-D01 | View public profile | Member |
| US-FEED-D02 | Follow a creator | Member |
| US-FEED-D03 | Subscribe to a creator | Member |
| US-FEED-D04 | Manage own account profile | Member |
| US-FEED-D05 | Message from profile | Member |
| US-FEED-E01 | Browse collection | Member |
| US-FEED-E02 | Collection checkout | Member |
| US-FEED-F01 | Messages inbox | Member |
| US-FEED-F02 | Send chat (dual inbox) | Member |
| US-FEED-F03 | Booking cards/notes in chat | Member |
| US-FEED-G01 | Audio landing | Member |
| US-FEED-G02 | Play audio from Home | Member |
| US-FEED-H01 | Open Calendar from feed | Member / Creator |
| US-FEED-H02 | Open Seller Tools from feed | Creator |

---

## 10. Revision

| Version | Date | Notes |
| --- | --- | --- |
| 1.0 | 2026-08-24 | Initial BA specification for Main Feed derived from current `/feed` implementation; Service Requests detailed separately in `us-service-requests.md` |
