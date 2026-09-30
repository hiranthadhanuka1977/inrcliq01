# InrCliq (Next.js)

Creator and fan platform built with the Next.js App Router. Fans follow creators, shop collections, book Special Requests, and message creators. Verified creators manage offerings, bookings, and profile settings from Seller Tools.

## Stack

- Next.js 16 (App Router) + React 19
- PostgreSQL + Prisma 7
- Session cookies for auth (OTP login + email signup / onboarding)

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   Copy `.env.example` to `.env` and set your Postgres credentials:

   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/inrcliq?schema=public"
   AUTH_SECRET="generate-with-openssl-rand-base64-32"
   NEXT_PUBLIC_APP_URL="http://localhost:3002"
   EMAIL_PROVIDER=sendgrid
   EMAIL_FROM=support@insider-hub.com
   SENDGRID_API_KEY=your-sendgrid-api-key
   ```

3. **Create database** (if it does not exist)

   ```bash
   psql -U postgres -c "CREATE DATABASE inrcliq;"
   ```

4. **Run migrations**

   ```bash
   npm run db:migrate
   ```

5. **Start dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3002](http://localhost:3002) (default port from `package.json`).

## Implemented product areas

### Auth & onboarding

| Area | Routes / notes |
| --- | --- |
| Login | `/` — OTP login; `POST /api/auth/login/send-code`, `…/verify-code` |
| Signup | `/signup` — email join + verify; `/verify-email?token=…` |
| Onboarding | `/onboarding/password`, `/handle`, `/interests` → `/feed` |
| Minor / guardian | `/onboarding/parent`, `/onboarding/waiting`, `/guardian/approve?token=…` |

### Live feed

- `/feed` — home feed (creators + posts)
- `/feed/audio` — audio landing
- `/feed/profile/[slug]` — public profile, collection shop, Special Requests CTA
- Create post (verified creators): exclusive/members-only option and UI-only “Also push to” platforms
- Own-profile cover/banner personalisation for verified owners

### Messages

- `/feed/messages` — per-user chat inboxes
- Sending a message **mirrors** into the receiver’s inbox (same pattern as booking confirmations)
- Opens scrolled to the **latest** message; light polling refreshes incoming mail
- Booking confirmation cards and accept / decline / deliver status notes deep-link into Calendar

### Calendar & Service Requests (Special Requests)

Feed nav label: **Calendar** → `/feed/bookings`

| Tab | Who | Purpose |
| --- | --- | --- |
| **Billboard** | Both | Month view of bookings / requests |
| **My Requests** | Requester | Outbound special requests |
| **Commitments** | Verified provider | Inbound requests (disabled until verified) |

**Lifecycle (current):** `RECEIVED` → `ACCEPTED` or `DECLINED` → `DELIVERED` (via complete / deliver).  
`IN_PROGRESS` / `CANCELLED` exist in schema but are not driven by current UI flows. Requester cancel is not implemented yet.

**Requester**

- Book from `/feed/profile/[slug]/requests` → personalize → checkout
- Instant vs non-instant: instant charges full total in UI; non-instant charges a **5% booking fee** (payment UI is simulated)
- Track status, deliver-by date, messages, and details drawer
- After delivery: star rating + optional quick picks / note (persisted per side on the booking)

**Provider**

- Accept (optional offer / note / attachment for non-instant; note-only for instant) or decline with reason
- Delivery countdown: “You are committed to deliver in…”
- **Instant:** **Deliver** + delivery file required  
- **Non-instant:** **Mark as completed**; delivery file optional
- Feedback after delivery (provider-side picks), same as requester

BA user stories for this module: [`US-BA-Specification/us-service-requests.md`](US-BA-Specification/us-service-requests.md)

### Seller Tools

- `/seller` — dashboard
- `/seller/service-requests` — calendar, offerings, inbox, setup; request items open Calendar Commitments details
- `/seller/settings` — settings hub; public profile / cover at `/seller/settings/public-profile`
- Placeholders: `/seller/subscriptions`, `/seller/wallet` (“Feature not available”)
- Category create/manage with instant booking flag and delivery formats

### Settings (platform admin)

- `/settings/dashboard` — default page with two pills: Users (the default: signups, account types, age zones, onboarding, parent approvals) and Feed (`?tab=feed`: posts, member vs seeded content, categories, post types, engagement, top creators)
- `/settings/users` — registered accounts, with Users (default) and Demo users (`?tab=demo`: seeded creator accounts, `signupMethod` `feed-creator`, plus other demo accounts such as the Anderson family, `signupMethod` `demo-seed`) pills; click a name for `/settings/users/[id]` (account, profile, creator identity, family links and feed posts; the feed posts cog menu deletes all of that user's posts after confirmation)
- `/settings/feed-mgmt` — Feed Mgmt: every feed post in home feed order, with links to its images, video, audio and creator profile plus all stored properties (search, category and member/seeded filters); each post's cog menu has Delete post (with confirmation)
- `/settings/feed-mgmt/settings` — seed sample settings (gear icon on Feed Mgmt): delete every seed post from `data/my_feed.json` and the profile `feed_posts` (confirmation, then type a random word), or restore only the missing ones in their original order from `data/feed-seed-order.json`; member posts are never touched. The same page deletes or restores the demo users in `data/demo-users.json` (accounts, profiles and parent-child links with the same IDs and handles; no passwords, so restored accounts sign in with email login codes; chats, follows and subscriptions are not restored). Regenerate that file from every `demo-seed` account with `npm run db:snapshot-demo-users`
- `/settings/partners` — external parties allowed to publish through the partner feed API: add a partner (its first API key is shown once), link the creators it may post as, issue or revoke keys, delete a partner (its posts stay in the feed)
- `/settings/reset` — clear all users and platform data (development); disabled by default — greyed out and not clickable in the menu, the page redirects to the dashboard and the API returns 403 until `SETTINGS_RESET_ENABLED` in `src/lib/settings/access.ts` is set to `true`

## Partner feed API

External parties publish feed posts with an API key issued in `/settings/partners`. Only a SHA-256 hash of each key is stored. The routes skip the demo Basic Auth gate and authenticate with `Authorization: Bearer ink_live_…` instead.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/partner/feed/posts` | Publish a post (`201`), or return the existing one when the same `externalId` and body are sent again (`200`) |
| `GET` | `/api/v1/partner/feed/posts/{id}` | Read a post this partner published |
| `DELETE` | `/api/v1/partner/feed/posts/{id}` | Delete it, with the same cleanup as admin deletes |
| `GET` | `/api/v1/partner/creators` | Creators this key may post as |

Request body for `POST`:

```json
{
  "externalId": "acme-2026-09-30-0001",
  "creator": { "handle": "planetunfolded" },
  "category": "travel",
  "text": "Sunrise over Sigiriya. #srilanka #travel",
  "tags": ["srilanka", "travel"],
  "membersOnly": false,
  "postedAt": "2026-09-30T04:30:00Z",
  "media": { "images": [{ "url": "https://cdn.example.com/1.jpg", "alt": "Sigiriya at sunrise" }] },
  "location": { "label": "Sigiriya, Sri Lanka", "lat": 7.957, "lng": 80.7603 },
  "feeling": { "kind": "feeling", "emoji": "😊", "label": "amazed" }
}
```

- Required: `externalId` (unique per partner), `creator.handle` (must be linked to the key), `category` (one of the home feed categories), and `text` and/or `media`.
- `media` takes exactly one of `images` (1–6 `{ url, alt }`), `video` (`{ url, posterUrl, posterAlt? }`) or `audio` (`{ url, title, durationSeconds, thumbnail: { url, alt } }`). All URLs must be `https`.
- Media is shown straight from the partner's URLs; it isn't copied or image-moderated. Post text goes through the same Azure text moderation as member posts.
- `membersOnly` needs a verified creator. `postedAt` defaults to now and can't be in the future or more than 30 days back. Tags default to the `#hashtags` in `text`.
- Posts appear for every age zone, publish immediately, and are added to the creator's profile.
- Errors use `{ "error": { "code", "message", "fields"? }, "requestId" }`: `400 validation_failed | invalid_json`, `401 unauthorized`, `403 creator_not_allowed | members_only_not_allowed`, `404 not_found`, `409 duplicate_external_id`, `413 payload_too_large`, `422 content_blocked`, `429 rate_limited` (60 posts per minute per partner, with `Retry-After`), `503 moderation_unavailable`, `500 internal_error`.

## Email (SendGrid)

Set `EMAIL_PROVIDER=sendgrid` with `EMAIL_FROM` and `SENDGRID_API_KEY` for real mail. Use `EMAIL_PROVIDER=console` (or omit SendGrid vars) to log to the server console.

Emails are sent for signup verification, login OTPs, guardian invites, child notifications on approve/decline, and profile-completion prompts after handle setup.

## Seed / one-off scripts (optional)

Feed posts (`FeedPost`) and profile details (`UserProfile`) are read only from the database; the profile and feed JSON files under `data/` are seed input for these scripts. Creator collections can still fall back to their JSON files.

```bash
npm run db:migrate-feed
npm run db:migrate-collection
npm run db:migrate-profiles
npm run db:link-creators
npm run db:seed-special-requests
npm run db:provision-special-requests-verified
npm run db:seed-good-guy
npm run db:seed-bns
npm run db:seed-top-creators
npm run db:seed-chat
```

## Known gaps (not fully productized yet)

- Real payment / refunds (checkout card UI is simulated)
- Instant auto-accept after pay (status stays `RECEIVED` until manual accept)
- Requester cancel flow
- Public profile reviews from booking feedback (feedback is private to Calendar)
- OAuth (Google / Apple) and full guardian ID verification screens

## Deploying to Vercel

1. Add Vercel Postgres or Neon
2. Set `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `EMAIL_PROVIDER`, `EMAIL_FROM`, and `SENDGRID_API_KEY`
3. **HTTP Basic Auth (demo gate)** — enabled automatically on Vercel. Optional overrides:
   - `BASIC_AUTH_ENABLED` = `true` / `false`
   - `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` (defaults: `demo@inrcliq.com` / `demo@inrcliq.com`)
4. Build command: `npm run build` (migrate with retries, then `next build`)

Visitors see the browser login prompt when entering the prototype. Settings is excluded from Basic Auth and uses a separate admin password. Locally Basic Auth stays off unless you set `BASIC_AUTH_ENABLED=true`.
