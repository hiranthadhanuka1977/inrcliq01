# Service Requests — User Stories & Acceptance Criteria

| Document | `us-service-requests.md` |
| --- | --- |
| Module | Service Requests (Special Requests / Bookings) |
| Based on | Current product implementation in `src/` |
| Actors | Requester (fan), Provider (verified creator), Guest, Platform admin |
| Primary surfaces | Feed Calendar, Profile Special Requests, Messages, Seller Tools, Settings Bookings |

---

## 1. Purpose

This specification captures **user stories and acceptance criteria** for the Service Requests module as implemented today: fans request personalized services from creators; verified creators manage offerings, accept/decline work, deliver assets, and both parties can leave experience feedback after delivery.

Stories reflect **current behaviour**. Known gaps and placeholders are listed in [§7 Out of scope / known gaps](#7-out-of-scope--known-gaps-relative-to-current-code).

---

## 2. Actors

| Actor | Description |
| --- | --- |
| **Requester** | Authenticated user who books a special request from a creator (`SpecialRequest.userId`). Uses **My Requests** and Billboard (own items). |
| **Provider** | Authenticated user who owns a **verified** creator profile and receives inbound requests (`creator.userId`). Uses **Commitments**, Seller Service Requests, and delivery tools. |
| **Guest** | Unauthenticated visitor. May browse public Special Requests catalog when live; cannot create bookings. |
| **Platform admin** | Operator using Settings → Bookings to list/search and accept/decline/delete bookings across creators. |

---

## 3. Status lifecycle (current)

| Status | Requester label | Provider label | Typical meaning |
| --- | --- | --- | --- |
| `RECEIVED` | Requested | Received | Created; awaiting provider decision |
| `ACCEPTED` | Accepted | Accepted | Provider accepted; delivery countdown may apply |
| `IN_PROGRESS` | In Progress | In Progress | Supported in UI/API; not actively transitioned by current flows |
| `DELIVERED` | Delivered | Delivered | Provider uploaded delivery and marked complete |
| `DECLINED` | Declined | Declined | Provider declined with a reason |
| `CANCELLED` | Cancelled | Cancelled | Present in schema; not set by current Service Requests flows |

**Implemented transitions**

1. Create → `RECEIVED`
2. `RECEIVED` → `ACCEPTED` (provider accept)
3. `RECEIVED` → `DECLINED` (provider decline + reason)
4. `ACCEPTED` or `IN_PROGRESS` → `DELIVERED` (provider deliver + file)

---

## 4. Navigation & entry points

| Surface | Route / entry | Who |
| --- | --- | --- |
| Feed nav **Calendar** | `/feed/bookings` | Requester, Provider |
| Tab **Billboard** | `?tab=calendar` | Both |
| Tab **My Requests** | `?tab=outbound` | Requester |
| Tab **Commitments** | `?tab=inbound` | Provider (verified only) |
| Deliver page | `/feed/bookings/[id]/deliver` | Provider |
| Profile **Special Requests** | `/feed/profile/[slug]/requests` | Guest browse; Requester book |
| Request choose / checkout | `/requests`, `/requests/choose`, `/requests/checkout` | Requester |
| Messages | `/feed/messages` (booking deep links) | Both |
| Seller Tools **Service requests** | `/seller/service-requests` | Provider |
| Settings **Bookings** | `/settings/bookings` | Platform admin |

---

## 5. Epics & user stories

### Epic A — Discover & configure offerings

#### US-SR-A01 — Browse a creator’s Special Requests catalog (Guest / Requester)

**As a** guest or requester  
**I want to** open a creator’s Special Requests page from their public profile  
**So that** I can see what personalized services they offer.

**Acceptance criteria**

1. When the creator’s Special Requests catalog is enabled and has public categories, the profile shows a Special Requests control that opens `/feed/profile/[slug]/requests`.
2. When the catalog is disabled or unavailable, the requester sees an unavailable state instead of a bookable catalog.
3. Guests can view live offerings but cannot complete a booking without signing in.
4. Catalog content reflects the creator’s configured categories, formats, pricing, and instant vs non-instant flags.

---

#### US-SR-A02 — Manage Service Requests catalog (Provider)

**As a** verified provider  
**I want to** configure Special Requests offerings in Seller Tools  
**So that** fans can book the right services at the right price.

**Acceptance criteria**

1. Verified providers can open Seller Tools → Service requests (and related Settings card).
2. Provider can manage offerings (categories/content), booking calendar / availability, and inbox of inbound requests.
3. Unverified creators do not get full inbound Commitments / seller booking APIs for Special Requests.
4. A verified creator without a catalog may receive a blank catalog provisioned for setup.
5. Provider can mark unavailable dates so those dates are blocked for booking.

---

### Epic B — Create a service request (Requester)

#### US-SR-B01 — Start a booking from Special Requests

**As a** requester  
**I want to** choose a service and personalize my request  
**So that** the provider knows what to deliver.

**Acceptance criteria**

1. Authenticated requester can progress from Special Requests → choose → checkout.
2. Checkout captures service details appropriate to the offering, including as applicable: booking type/label, category, occasion, formats/content type, duration/format details, tone, delivery method, recipient (and username if required), shoutout message, special instructions.
3. Appearance-style offerings capture location, expectation, reference, and duration where applicable.
4. Fees shown include day/feed/total amounts and currency as configured.
5. Request date / deliver-by timing is captured according to the flow.
6. Unauthenticated attempts to create a booking via API are rejected (401).

---

#### US-SR-B02 — Instant vs non-instant booking terms

**As a** requester  
**I want to** understand whether I am paying a booking fee or the full amount now  
**So that** I know what I owe at checkout.

**Acceptance criteria**

1. If the category is **instant booking**, checkout presents charging the **full total** now (per current UI rules).
2. If the category is **non-instant**, checkout presents a **booking fee** (5% of total) due now and requires acceptance of fee/terms where shown.
3. The `instantBooking` flag is stored on the created request for later accept UX.
4. Creating a request always starts in status `RECEIVED` (including instant bookings — no auto-accept in current implementation).

---

#### US-SR-B03 — Submit booking and confirmation in Messages

**As a** requester  
**I want to** complete checkout and receive a confirmation in Messages  
**So that** I have a record of my request.

**Acceptance criteria**

1. Successful submit creates a `SpecialRequest` with a unique reference and status `RECEIVED`.
2. A booking confirmation message is posted to the requester–provider conversation thread(s).
3. Requester can open the related booking from Messages into Calendar with the correct context (booking/ref/tab).
4. Payment UI may be simulated (no live PSP required for current build); submit still persists the booking and chat confirmation.

---

#### US-SR-B04 — Respect provider availability

**As a** requester  
**I want** booking blocked on dates the provider cannot take  
**So that** I do not request an unavailable slot.

**Acceptance criteria**

1. Dates marked unavailable by the provider cannot be booked.
2. Dates occupied by blocking booking statuses (`RECEIVED`, `ACCEPTED`, `IN_PROGRESS`, `DELIVERED`) are treated as unavailable for new bookings per current calendar rules.

---

### Epic C — Calendar & list views (Requester & Provider)

#### US-SR-C01 — Use Calendar Billboard

**As a** requester or provider  
**I want** a month Billboard of my alerts, events, bookings, and requests by date  
**So that** I can see what is happening on each day.

**Acceptance criteria**

1. Feed nav **Calendar** opens `/feed/bookings` with Billboard as the default calendar tab.
2. Billboard supports filters such as **All / Commitments / My Requests**.
3. Selecting a day shows bookings for that date; empty days show a clear empty message (e.g. none for today/this day).
4. Selecting a booking opens booking details (drawer) without navigating to a profile by clicking the card container.

---

#### US-SR-C02 — View My Requests (Requester)

**As a** requester  
**I want** a list of outbound service requests  
**So that** I can track status and act on completed work.

**Acceptance criteria**

1. **My Requests** tab lists only outbound bookings for the signed-in user.
2. Each card shows request title, status, reference, counterpart identity (non-clickable to profile), key facts (e.g. total, date, content type).
3. Card actions include **Messages** and **Details** when available; after delivery, **Feedback** or saved rating appears on the **left**; right-side actions order is **Deliver** (N/A for requester) → **Messages** → **Details**.
4. Empty state explains that paid special requests will appear here.

---

#### US-SR-C03 — View Commitments (Provider)

**As a** verified provider  
**I want** a list of inbound service requests  
**So that** I can accept, decline, deliver, and message fans.

**Acceptance criteria**

1. **Commitments** is available only when the user is a verified creator; otherwise the tab is disabled with guidance to get verified.
2. List shows inbound bookings with status, reference, requester identity (non-clickable to profile), and facts.
3. For `RECEIVED`, provider can Accept / Decline from the card or details drawer.
4. For `ACCEPTED` / `IN_PROGRESS`, provider sees delivery countdown with copy: **“You are committed to deliver in…”** and a **Deliver** action.
5. Action order on cards: Feedback/rating (left, when applicable); **Deliver**, **Messages**, **Details** (right).
6. Empty state explains that incoming requests appear here.

---

#### US-SR-C04 — Open booking details drawer

**As a** requester or provider  
**I want** a details slide panel for a booking  
**So that** I can review the full service summary and take the next action.

**Acceptance criteria**

1. **Details** opens a slide panel with booking title, reference, status badge, and counterpart block (not linking to profile).
2. Panel shows service summary rows (type, category, formats, delivery, recipient, message, special instructions, total, and acceptance note/offer/attachment when present).
3. Panel shows timestamps: Created; Deliver by (when accepted/in progress/delivered); Accepted / Declined (+ reason) when applicable.
4. Contextual actions appear: Accept/Decline, Deliver confirmation entry, Give feedback / view rating, and **Open messages** when a messages link exists.
5. Closing the panel clears booking selection from the URL where used.

---

### Epic D — Accept & decline (Provider)

#### US-SR-D01 — Accept a received request

**As a** provider  
**I want to** accept an inbound request  
**So that** I commit to deliver by the agreed time.

**Acceptance criteria**

1. Accept is available only for inbound bookings in `RECEIVED`.
2. For **non-instant** bookings, accept may include optional offer price, note, and file attachment (allowed types via upload API).
3. For **instant** bookings, accept collects an optional note only (no offer price/attachment in feed accept UX).
4. On success, status becomes `ACCEPTED`, `acceptedAt` is set, optional acceptance details are stored, and total may update if an offer price is applied.
5. Status notes are posted to both parties’ message threads.
6. UI updates status/labels without requiring a full page reload of the session list where optimistic/patch updates apply.
7. Seller Inbox may support accept/decline with a simpler payload (no offer/attachment) compared to Feed Commitments.

---

#### US-SR-D02 — Decline a received request

**As a** provider  
**I want to** decline a request with a reason  
**So that** the requester understands why it will not proceed.

**Acceptance criteria**

1. Decline is available only for inbound `RECEIVED` bookings.
2. A decline reason is **required**; empty reason is rejected.
3. On success, status becomes `DECLINED`, decline metadata is stored, and both parties receive a decline note in Messages.
4. Details panel shows declined time and reason.

---

### Epic E — Delivery countdown & fulfillment (Provider & Requester)

#### US-SR-E01 — See delivery countdown

**As a** requester or provider  
**I want** a live countdown after acceptance  
**So that** I know how much time remains until the deliver-by deadline.

**Acceptance criteria**

1. Countdown shows only when status is `ACCEPTED` or `IN_PROGRESS` and a `deliverBy` timestamp exists.
2. **Requester** copy: receive-oriented (“You will receive your delivery in…”).
3. **Provider** copy: commitment-oriented (“You are committed to deliver in…”).
4. Countdown appears on list cards (compact) and in the details drawer; accept notes in chat may also surface countdown context.

---

#### US-SR-E02 — Confirm and deliver work

**As a** provider  
**I want to** confirm readiness, upload my delivery, and mark the request delivered  
**So that** the requester receives the completed work.

**Acceptance criteria**

1. **Deliver** is available for inbound `ACCEPTED` or `IN_PROGRESS` bookings from list and details.
2. Clicking Deliver opens confirmation: **“Ready to complete this request?”** with Cancel / Continue.
3. Continue navigates to `/feed/bookings/[id]/deliver` with request review, required file upload, optional note, and mark-delivered action.
4. Delivery file must be uploaded successfully; marking delivered without a valid `/uploads/…` file fails.
5. On success, status becomes `DELIVERED`, delivery metadata is stored, both parties get a delivered note in Messages, and the provider returns to Calendar with a success toast (reference when available).
6. Deliver is not available to the requester.

---

### Epic F — Feedback (Requester & Provider)

#### US-SR-F01 — Submit experience feedback after delivery

**As a** requester or provider  
**I want to** rate the experience after a request is delivered  
**So that** I can record how the engagement went.

**Acceptance criteria**

1. Feedback is available only when status is `DELIVERED`.
2. Both requester and provider may each submit **once** for that booking (separate stored entries).
3. Submission requires a **1–5 star** rating; optional quick selections and optional note (≤ 500 characters).
4. Quick picks differ by role (requester vs provider presets).
5. Feedback is persisted on the booking (`detailsJson.feedback.requester` / `.provider`) via API.
6. Duplicate submit returns already-submitted behaviour without overwriting the original entry.
7. Success shows a toast and updates the UI to the saved rating control.

---

#### US-SR-F02 — View my submitted feedback

**As a** requester or provider  
**I want to** see my star rating on the booking and open full feedback details  
**So that** I can review what I submitted.

**Acceptance criteria**

1. After submit, the list footer shows the rating control on the **left** (stars + score), not a second “Feedback” CTA.
2. Clicking the rating opens a details modal with stars, quick selections, note (or empty-note message), reference, and submitted time.
3. Details drawer likewise offers the rating control and the same details modal.
4. Each party only sees **their own** feedback in Calendar UI (not the other party’s submission).
5. Feedback is not published to public profile reviews in the current implementation.

---

### Epic G — Messaging & notifications

#### US-SR-G01 — Booking lifecycle notes in Messages

**As a** requester or provider  
**I want** chat notes for request, accept, decline, and deliver events  
**So that** conversation history reflects the booking lifecycle.

**Acceptance criteria**

1. Creating a booking posts a confirmation card/note with reference and key booking facts.
2. Accept, decline, and deliver each post status notes visible to both parties (with reason, offer, attachment/delivery file references as applicable).
3. Notes/cards can deep-link into Calendar with booking context.
4. **Open messages** / **Messages** from Calendar uses the booking’s messages href when available.

---

### Epic H — Seller Inbox & admin oversight

#### US-SR-H01 — Manage inbound requests in Seller Tools

**As a** verified provider  
**I want** an Inbox and calendar for inbound Special Requests  
**So that** I can operate bookings alongside offerings setup.

**Acceptance criteria**

1. Seller Service Requests includes Calendar, Offerings, Inbox, and Setup (or equivalent tabs).
2. Inbox lists inbound bookings and supports accept/decline for eligible items.
3. Availability management affects what fans can book.
4. Access requires verified creator identity and Special Requests capability per seller APIs.

---

#### US-SR-H02 — Administer bookings (Platform admin)

**As a** platform admin  
**I want to** search and manage bookings in Settings  
**So that** I can support operations across creators.

**Acceptance criteria**

1. `/settings/bookings` lists bookings grouped by creator with search (creator/ref/requester as implemented).
2. Admin can open a booking detail panel and accept/decline (and delete where supported).
3. Admin actions update booking status consistently with shared booking helpers.

---

## 6. Cross-cutting acceptance criteria

1. Unauthenticated users cannot mutate bookings (create/accept/decline/deliver/feedback); Calendar may redirect guests to home.
2. Only the owning provider can accept, decline, or deliver a booking; either party to the booking may submit their own feedback after delivery.
3. Booking references are unique and shown in UI as `Ref …`.
4. Status badges use consistent labels for each actor perspective (`Requested` vs `Received` for `RECEIVED`).
5. List card containers and counterpart name/avatar blocks do **not** navigate to profiles; only explicit Messages / Details / Deliver / Feedback actions apply.
6. File uploads for accept attachments and deliveries go through the bookings upload endpoint and store under `/uploads/…`.

---

## 7. Out of scope / known gaps (relative to current code)

These items are **not** accepted as delivered behaviour today; do not treat them as AC unless product later implements them.

| Gap | Notes |
| --- | --- |
| Instant auto-accept after payment | Copy may imply auto-approve; status remains `RECEIVED` until manual accept |
| Real payment / refund automation | Checkout payment is simulated; fee-refund copy is informational |
| `IN_PROGRESS` / `CANCELLED` transitions | Enum exists; flows do not set these statuses |
| Requester cancel flow | Not implemented |
| Public profile reviews from booking feedback | Feedback is private to Calendar; profile reviews may be synthetic |
| Cross-party feedback visibility | Each side sees only their own feedback |
| Aggregate seller ratings from deliveries | Not wired |
| Parity of Seller Inbox accept with Feed (offer + attachment) | Seller accept is simpler |

---

## 8. Story ID index

| ID | Title | Primary actor |
| --- | --- | --- |
| US-SR-A01 | Browse Special Requests catalog | Guest / Requester |
| US-SR-A02 | Manage Service Requests catalog | Provider |
| US-SR-B01 | Start booking from Special Requests | Requester |
| US-SR-B02 | Instant vs non-instant terms | Requester |
| US-SR-B03 | Submit booking + Messages confirmation | Requester |
| US-SR-B04 | Respect provider availability | Requester |
| US-SR-C01 | Calendar Billboard | Requester / Provider |
| US-SR-C02 | My Requests list | Requester |
| US-SR-C03 | Commitments list | Provider |
| US-SR-C04 | Booking details drawer | Requester / Provider |
| US-SR-D01 | Accept received request | Provider |
| US-SR-D02 | Decline received request | Provider |
| US-SR-E01 | Delivery countdown | Requester / Provider |
| US-SR-E02 | Confirm and deliver work | Provider |
| US-SR-F01 | Submit experience feedback | Requester / Provider |
| US-SR-F02 | View submitted feedback | Requester / Provider |
| US-SR-G01 | Lifecycle notes in Messages | Requester / Provider |
| US-SR-H01 | Seller Tools inbound management | Provider |
| US-SR-H02 | Admin bookings oversight | Platform admin |

---

## 9. Revision

| Version | Date | Notes |
| --- | --- | --- |
| 1.0 | 2026-08-23 | Initial BA specification derived from current Service Requests implementation |
