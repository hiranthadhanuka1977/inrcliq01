# INRCLIQ — Usability Testing Scripts

High-level tasks for moderated usability sessions. Ask participants to **think aloud**. Do not coach unless they are stuck for ~2 minutes. Observe where they hesitate, misclick, or abandon.

**Suggested setup:** one facilitator, one note-taker, prototype URL + HTTP Basic Auth credentials, test emails ready.

**Success criteria (per task):** completed without help · completed with one hint · failed / abandoned

---

## Session opener (2–3 min)

1. Explain this is a prototype; there are no wrong answers.
2. Ask them to say what they see and what they expect next.
3. Confirm device (desktop / mobile) and role for this session.

---

## Participant roles

| Role | Use for |
|------|---------|
| **Adult fan** | Signup (18+), feed, audio, profiles, shop, special requests, messaging |
| **Minor** | Underage signup, parent invite, waiting, continue after approval |
| **Guardian** | Approval email / invite link, identity & protection choices |
| **Returning user** | Login, forgot login, logout |

Run adult-fan tasks with most testers. Run minor + guardian as a paired scenario when possible.

---

## A. First-time adult fan

### A1. Create an account
> “Imagine you want to join InrCliq. Create a new account with your details and get as far as you can toward using the product.”

**Covers:** signup, email verification, onboarding routing  

### A2. Finish setting up your profile
> “Complete whatever steps the product asks so you can start browsing content.”

**Covers:** password, handle, interests, welcome into feed  

### A3. Sign out and come back
> “Leave the product, then sign back in as if you returned later.”

**Covers:** logout, login (password and/or email code)  

### A4. Recover access without your password
> “Pretend you forgot your password. Get back into your account.”

**Covers:** forgot login / login code  

---

## B. Minor + guardian (paired)

### B1. Minor starts signup
> “You’re under 18 and want to join. Start signing up and follow what the product asks you to do next.”

**Covers:** minor path, parent invite  

### B2. Minor waits for approval
> “You’ve invited a parent. Show me how you’d check what’s happening and what you’d do if the email didn’t arrive.”

**Covers:** waiting status, resend, change parent email  

### B3. Guardian reviews the request
> “You’re the parent. Open the approval email/link and decide whether to approve this child. Complete whatever the product asks.”

**Covers:** guardian journey, identity/context, protection levels, approve/decline  

### B4. Minor continues after approval
> “Your parent approved. Continue from the email (or in-app notice) and finish setting up your account.”

**Covers:** approval email continue link, password/handle/interests  

---

## C. Discover & engage (home feed)

### C1. Explore what’s new
> “Spend a minute on the home feed. Tell me what this place is for and what you’d tap first.”

**Covers:** timeline, stories/snaps, rails, first impressions  

### C2. Find content you’re interested in
> “Try to focus the feed on a topic or category you care about.”

**Covers:** category filters  

### C3. Engage with a post
> “Find a post you like and interact with it the way you normally would on social apps.”

**Covers:** like, comment, share, hide, follow from post  

### C4. Notice restricted content
> “If you see anything that looks members-only or locked, tell me what you think it means and what you’d do next.”

**Covers:** members-only treatment, subscribe intuition  

---

## D. Audio

### D1. Go listen to something
> “Find a place to listen to podcasts, music, or audiobooks and start playing something.”

**Covers:** audio hub entry, browse/discover  

### D2. Control playback
> “While something is playing, show me how you’d pause, jump around, or open a bigger player.”

**Covers:** mini / dock / fullscreen players  

---

## E. Creators & relationships

### E1. Open a creator’s page
> “Pick a creator from the feed and open their profile. Tell me what you can do here.”

**Covers:** profile cover/bio, popular posts, creator feed  

### E2. Follow or subscribe
> “Make sure you’ll see more from this creator later. Choose how (or whether) you want to be notified.”

**Covers:** follow, subscribe, notification levels  

### E3. Move around from a profile
> “From this profile, find their shop or any special/custom experiences they offer.”

**Covers:** profile navigation to collection / special requests  

---

## F. Creator shop

### F1. Browse the shop
> “Look through what this creator is selling. Filter or open a product that interests you.”

**Covers:** storefront, physical/digital browsing, product detail  

### F2. Add to bag and check out
> “Add something to your bag and go as far as you can through checkout (you don’t need a real payment).”

**Covers:** cart, quantities/variants, promo, shipping, confirmation  

---

## G. Special requests

### G1. Explore bookable experiences
> “This creator offers personal experiences (shout-outs, coaching, appearances). Explore what’s available and pick one you’d book.”

**Covers:** categories, galleries, pricing, reviews  

### G2. Personalize a booking
> “Configure the experience as if it were for a real person or event, then continue as far as the flow allows.”

**Covers:** delivery, recipient, timing, location search for appearances  

---

## H. Messaging

### H1. Open your inbox
> “Find your messages and open a conversation.”

**Covers:** inbox, unread indicators, navigation  

### H2. Send a message
> “Send a short message in that conversation. Then find another thread if you can.”

**Covers:** send/read, thread search  

---

## I. Closing questions (optional, 3–5 min)

1. What felt clearest? What felt confusing?
2. Where would you expect to manage your account or privacy?
3. Would you trust this product for a younger family member? Why / why not?
4. On a scale of 1–5, how easy was it to accomplish your main goal today?

---

## Suggested session packs

| Pack | Duration | Tasks |
|------|----------|--------|
| **Core fan** | ~25–30 min | A1 → A2 → C1 → C2 → C3 → E1 → E2 → I |
| **Commerce fan** | ~30–35 min | A (if needed) → E1 → E3 → F1 → F2 → G1 → G2 → I |
| **Audio fan** | ~20–25 min | C1 → D1 → D2 → E1 → H1 → H2 → I |
| **Family safety** | ~35–45 min | B1 → B2 → B3 → B4 → I |
| **Return visit** | ~15 min | A3 → A4 → C1 → H1 |

---

## Facilitator tips

- Prefer **goals** (“find something to buy”) over UI labels (“click Collection”).
- Note first-click and time-to-completion; don’t score “right path,” score **task completion**.
- If email steps appear, point them to the in-app email preview only after they look for email themselves.
- Skip admin/ops tasks (user directory, platform reset) — those are internal, not end-user scenarios.
