# InrCliq Prototype — Feature List (Detailed)

| | |
|---|---|
| **Document** | Prototype feature inventory (page and control level) |
| **Prepared** | 4 October 2026 |
| **Code version** | `main` @ `b51a904` |
| **Audience** | Business analysts, product owners, stakeholders |

InrCliq is a creator-led social platform. Fans follow creators, browse a feed, shop creator collections, book personalised "Special Requests" and message creators. Under-18 users join through parent/guardian approval, and guardians get a Family Circle dashboard with direct-message (DM) safety controls.

This document lists what the prototype does today, down to the individual sections, buttons and controls on each page, and states clearly where something is not finished.

---

## How to read this document

Each main feature is split into pages or areas. Each area has a table:

- **Feature** — the section, button, field or behaviour.
- **What it does** — a short description of what works today.
- **Status** — one of the values below.
- **Missing / not yet built** — gaps, shortcuts, fake data and known problems. A dash (—) means nothing notable is missing.

| Status | Meaning |
|---|---|
| **Working** | Built end to end; data is saved and survives a page reload (or the control genuinely does its job). |
| **Partial** | Works, but an important part is missing or faked. |
| **Simulated** | Looks real on screen, but nothing actually happens behind it: fake or hardcoded data, nothing saved, no payment, no sound. |
| **Placeholder** | Shown on screen but does nothing: "Coming soon", disabled, no click action, or a link that goes nowhere. |
| **Not built** | Expected feature that does not exist yet. |

---

## Summary

| # | Main feature | Overall status | In one line |
|---|---|---|---|
| 1 | Access & Accounts | Working | Email signup, email-code and password login, sessions. Google/Apple sign-in is faked or disabled. |
| 2 | Onboarding | Partial | Password and handle steps work; chosen interests are not saved. |
| 3 | Minor Signup & Guardian Approval | Partial | Full parent-approval journey works; guardian ID and face scan are simulated. |
| 4 | App Navigation | Partial | Main menu works; Explore, Purchases and Notifications go nowhere. |
| 5 | Home Feed | Partial | Real posts, follow, hide and delete; reactions, comments, share and bookmarks are not saved. |
| 6 | Create Post | Working | Text, photos, video, location, feeling, tags, members-only. GIFs are a fixed list; cross-posting not live. |
| 7 | Audio | Simulated | Rich Audio page built entirely on sample data; no player makes any sound. |
| 8 | Photos, Videos, Snaps | Placeholder | "Coming soon" pages. |
| 9 | Profiles & My Account | Partial | Profiles, follow, subscribe and avatar work; profile details cannot be edited. |
| 10 | Creator Shop | Simulated | Real product catalog; bag and checkout are simulated, no order is saved. |
| 11 | Special Requests (Fan side) | Partial | Full booking wizard creates real bookings; payment is simulated. |
| 12 | Messages | Working | Real one-to-one chat, text only, refreshes every 4 seconds. |
| 13 | Calendar (Bookings) | Working | Full offer, counter-offer, delivery and feedback flow; payments simulated. |
| 14 | Seller Tools | Partial | Storefront, products, service catalog and availability work; some stats are fake; Wallet and Subscriptions are placeholders. |
| 15 | Family Circle (Guardian Dashboard) | Partial | Real children, alerts and DM controls; scores, Controls and Requests are simulated. |
| 16 | DM Safety & Content Moderation | Working | Messages to minors are checked, held for guardian review and repeat offenders restricted. |
| 17 | Platform Admin (Settings) | Working | Dashboards, users, AI users, feed management, seed data and partners. |
| 18 | Partner Feed API | Working | External partners publish posts with API keys. |
| 19 | Platform & Infrastructure | Partial | Demo password gate, analytics, email, file storage, one scheduled job. |

A list of **known defects** found during this review is at the end of the document.

---

## 1. Access & Accounts

### 1.1 Shared controls (all sign-in, onboarding and guardian screens)

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Demo password gate | Hosted site asks for a shared browser username/password before any page loads. | Working | Shared demo password, not real access control. |
| Logo | Links to the login page; hides on scroll. | Working | — |
| Theme switcher (sun/moon) | Toggles light and dark mode. | Working | Saved in the browser only. |
| Prototype controls > Reset Prototype | Logs out and clears this browser's saved app data. | Working | Does not delete accounts (the confirmation says so). |
| Prototype controls > Settings | Asks for the admin password and opens the admin area. | Working | — |
| Signup progress bar | Fills as the user moves through signup and onboarding. | Working | Visual only. |

### 1.2 Prototype consent popup (login page)

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Data Privacy & Consent text | Explains what is collected, why, how long (deleted by 31 Oct 2026) and user rights. | Working | No real deletion job behind the 31 Oct date. |
| Contact email link | Opens the user's email app. | Working | — |
| "I agree" checkbox + Continue | Enables Continue and closes the popup. | Partial | Consent is remembered only for the browser tab session and not saved on the server; analytics load regardless of consent. |

### 1.3 Login page

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| "Create a free account" | Goes to signup. | Working | — |
| Continue with Google / Apple | Buttons shown. | Placeholder | Disabled; no Google/Apple sign-in. |
| Email field | Validates the email address. | Working | — |
| Send login code | Emails a 6-digit code (valid 10 minutes, 30-second resend wait). Unknown or unverified emails get clear messages. | Working | The code is also returned to the browser for the demo inbox (prototype shortcut, not secure). |
| 6-digit code field | Digits only; logs in automatically when 6 digits are typed. | Working | — |
| Countdown + Send again | 30-second countdown, then resend. | Working | — |
| Change email on code step | — | Not built | No back/change-email control on the code step. |
| Demo inbox (envelope button) | Shows the login-code email with a Copy code button. | Simulated | Demo aid only. |
| Use password to login | Switches to email + password. | Working | — |
| Password login | Email + password with show/hide; clear errors (wrong password, no password set, unverified). | Working | No lockout or rate limit on wrong attempts. |
| Forgot login details? | Goes to Forgot login. | Working | — |
| Already logged in | Sends the user to their next onboarding step or the feed. | Working | — |
| "I am done for now" landing page (`?parentDone=1`) | Bare page with "placeholder home screen" text and Log out. | Placeholder | Unstyled, no real content. |
| Bad "Continue signup" email link | — | Not built | User lands on login with no error message. |

### 1.4 Sign up

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Age requirements notice | Says age rules depend on country. | Partial | Real rule is "under 18 = minor" in every country. |
| Continue with Google / Apple | Prefills a fixed demo name and continues. | Simulated | No real Google/Apple; creates a made-up email and skips verification. |
| Continue with email | Goes to the details step. | Working | — |
| Terms and Conditions / Privacy Policy links | — | Placeholder | Links go nowhere; no legal pages. |
| Email, first name, last name | Validated with clear messages. | Working | — |
| Date of birth (month / day / year) | Decides adult or minor and the age zone. | Partial | Impossible dates (e.g. 31 Feb) are accepted and roll over. No minimum age. |
| Country | Sri Lanka, United States, United Kingdom, Australia, India. | Working | Only 5 countries. |
| State (US only) | Required for the United States. | Working | Missing state shown as a browser alert box. |
| Next | Creates the account, emails a verification link. | Working | An unverified email signing up again overwrites the earlier attempt. |
| Verify step: Change email (pencil) | Returns to the details step. | Partial | After a page reload the form comes back empty and fails. |
| Verify step: Resend email | Sends a new link with a 30-second countdown. | Working | — |
| Verify step: "What to look for" | Explains sender, subject, arrival time and 24-hour validity. | Partial | Quotes a slightly different subject from the real email. |
| Verify step: Demo inbox | Shows the verification email with a working button. | Simulated | Demo aid only. |

### 1.5 Verify email and Forgot login

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Verification link | Confirms the email (single use, 24 hours), logs the user in and continues onboarding. | Working | — |
| Expired / invalid link screen | Error with "Back to signup". | Working | — |
| Forgot login | Sends a one-time login code. | Partial | No password reset or change-password flow. |
| Sessions & logout | Sessions last 30 days; logout ends the session. | Working | — |

---

## 2. Onboarding

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Step routing | Sends each user to their next unfinished step. | Working | — |
| **Password:** password field + show/hide + live rule tick | 8+ characters, letters and numbers. | Working | No confirm-password field or strength meter. |
| **Password:** Next / Skip | Saves the password, or skips (user logs in with email codes). | Working | — |
| **Handle:** handle field | Prefilled suggestion; up to 24 characters; letters, numbers, `_` and `.`. | Working | No live "is it available" check while typing. |
| **Handle:** Next / Skip | Saves the handle and creates the public profile; "already taken" error. | Working | — |
| **Interests:** 12 interest chips | Music, Sports, Gaming, Fitness, Food, Travel, Fashion, Technology, Finance, Art, Lifestyle, Education. | Partial | Selection is on screen only. |
| **Interests:** Continue | Completes onboarding, adds demo chats, sends "profile ready" email, opens the feed. | Partial | **Chosen interests are not saved** and do not personalise anything. |
| **Interests:** "Update these later" hint | — | Not built | No page to change interests. |
| Welcome demo chats | New users get sample conversations with creators. | Working | Demo creators never reply. |

---

## 3. Minor Signup & Guardian Approval

### 3.1 Age zones

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Age zones | Kids (under 13), Teens (13–15), Mature Teens (16–17), Adult (18+), from date of birth. | Partial | Only affect DM safety rules and labels — not the feed or profiles. Nothing happens on a birthday that moves a child up a zone. |

### 3.2 Child side

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| **Parent invite:** parent email field | Rejects the child's own email; 30-second resend wait. | Working | — |
| **Parent invite:** "Here's what we'll send them" preview | Shows the email preview. | Partial | Wording differs slightly from the real email. |
| **Parent invite:** Send email | Emails the parent an approval link valid for 24 hours. | Working | Expired invites are never marked "Expired". |
| **Parent invite:** "I'm actually 18+" | Correct date of birth; if 18+, the account becomes adult. | Working | Age zone not recalculated straight away. |
| **Waiting:** automatic status check | Checks every 4 seconds and moves on when approved. | Working | — |
| **Waiting:** status card and "Pending" badge | Shows email sent and time until expiry. | Partial | "Just now" and "Pending" are fixed; never shows "Expired". |
| **Waiting:** "Temporary account for 48 hours" notice | — | Simulated | Not enforced. |
| **Waiting:** Resend email | Sends a new link; cancels the old one. | Working | — |
| **Waiting:** Use a different parent email | Back to the invite step. | Working | — |
| **Waiting:** Declined state | "Request declined" with "Try a different parent email". | Working | — |
| **Waiting:** Demo inbox | Shows the parent's email with a working "Review request" button. | Simulated | Demo aid only. |
| **Approved:** "Your parent approved!" + Continue | Moves the child on to password setup. | Working | — |
| "Continue signup" email link | Signs the child in (valid 72 hours). | Working | — |

### 3.3 Guardian approval journey

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Link checks | Missing, invalid, expired or used links show an error. | Partial | One generic message for all cases; dead end with no button. |
| **Landing:** "{Child} wants to join" + feature cards + steps | Explains the process. | Partial | One card says approval is needed "under 16" (rule is under 18). Mentions a "$1 card hold" that does not exist. |
| **Landing:** "Explore more about InrCliq" | Goes to the login page. | Partial | No marketing page. |
| **Landing:** Set up parental control | Starts the journey (create account, or continue if already a guardian). | Working | — |
| **Landing:** Decline | Confirms, marks the request declined and emails the child. | Working | Says details are "deleted" — nothing is deleted. |
| "Already have an account? Log in" | Login popup prefilled with the parent email. | Working | — |
| Step bar (Account · Verify · Review · Protection · Approved) | Shows progress. | Working | Not clickable. |
| **Account:** email (read-only) | Shows the parent email. | Working | — |
| **Account:** Edit email (pencil) | — | Placeholder | Does nothing. |
| **Account:** password, country, state, confirmation checkbox | Creates the guardian account. | Working | No name or date-of-birth fields; name is made up from the email. |
| **Account (signed-in guardian):** Continue approval | Skips to protection level. | Working | — |
| **Child sidebar:** name, age, email, DOB, country, sent date | Real child details. | Working | — |
| **Child sidebar:** Edit name / DOB / country (pencils) | — | Placeholder | Do nothing. |
| **Verify intro** | Explains ID + face scan. | Working | — |
| **ID scan:** document type (Passport / National ID / Driving licence) | Selectable. | Partial | Not saved. |
| **ID scan:** live camera + Capture ID | Camera opens; capture shows a 2-second progress bar. | Simulated | Nothing is captured, uploaded or checked. |
| **Face scan:** selfie camera + Capture selfie | Same as ID scan. | Simulated | No face match. |
| **Verifying** | Checklist animation, always passes after ~5 seconds. | Simulated | Promised "we'll email you" is never sent. |
| **Review:** "Identity verified" + extracted ID details | Shows name, date of birth, ID type and ID number. | Simulated | All made up; nothing stored. Guardian date of birth never saved. |
| **Review:** "{Child} lives with me" + country/state | Records where the child lives. | Working | Missing US state only caught at the final step, where there is no back button. |
| **Protection level:** Strict / Standard / Relaxed cards | Guardian picks a level; each card lists rules (DMs, comments, screen time, creators). | Partial | **Level is saved but none of the listed rules are enforced.** Standard is always recommended regardless of age. |
| **Protection level:** Approve and activate | Approves, links guardian and child, emails the child. | Working | No back or decline button on this step. |
| **Success:** "{Child}'s account is live!" + summary + checklist | Confirms approval. | Partial | Overstates — child still has onboarding steps left. |
| **Success:** Go to Family Circle | Opens the guardian dashboard. | Partial | A newly created guardian is not logged in, so lands on the login page. |
| **Success:** I am done for now | Goes to a bare placeholder page. | Placeholder | — |
| Change protection level later | — | Not built | No screen to change it after approval. |
| Invite a second guardian | — | Not built | Data model supports it; no screen. |

### 3.4 Emails in these journeys

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Verification, login code, parent invite, child approved, child declined, profile ready | Sent via SMTP (or written to the server log when SMTP is not set up). | Working | Declined email's button goes to login rather than to "try another parent". |
| Guardian welcome, "identity verified", password reset, approval reminders | — | Not built | — |

---

## 4. App Navigation

### 4.1 Desktop left menu

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Logo | Goes to Home. | Working | — |
| Theme toggle | Light / dark. | Working | Saved in the browser only. |
| Notifications heart (with red dot) | — | Placeholder | Goes nowhere; dot always shows. No notifications feature. |
| Home | Opens the feed. | Working | — |
| Messages + unread badge | Opens Messages; badge is a real unread count. | Working | — |
| Snaps / Photos / Videos / Audio | Open those pages. | Working | Photos, Videos, Snaps are placeholders (section 8). |
| Explore | — | Placeholder | Goes nowhere. |
| Purchases | — | Placeholder | Goes nowhere. |
| Calendar | Opens bookings Calendar. | Working | — |
| Seller Tools | Opens Seller Tools. | Working | — |
| Family Circle | Shown to guardians only. | Working | — |
| Seller Tools promo card | "Open Seller Tools" button. | Working | — |
| Create button | Opens Create Post. | Working | — |
| Profile chip + menu (Profile, Dark/Light mode, Logout) | Profile, theme and logout. | Working | — |
| Search, Settings item | — | Not built | No global search on desktop menu. |

### 4.2 Mobile bottom menu

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Home, Create (+), Messages (+ unread badge) | As desktop. | Working | — |
| Media tab | Sheet with Snaps, Photos, Videos, Audio; remembers last choice for the session. | Working | — |
| More sheet: Calendar, Seller Tools, Profile, Theme, Logout | As desktop. | Working | — |
| More sheet: Settings | Opens the password-protected admin area. | Partial | Not user settings. |
| More sheet: Explore, Purchases | — | Placeholder | Go nowhere. |
| Family Circle, Notifications, Search on mobile | — | Not built | Guardians have no Family Circle link on mobile. |

---

## 5. Home Feed

### 5.1 Stories bar

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| "Your Snap" tile | — | Placeholder | Goes nowhere; no story creation. |
| 24 celebrity story avatars | Show coloured or muted rings and "offline" dimming. | Simulated | Fixed sample data; links go nowhere; no story viewer. |
| Previous / Next arrows | Scroll the row. | Working | — |

### 5.2 Greeting and category filter

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Avatar | Opens your profile. | Working | — |
| "Good morning/afternoon/evening, {name}" | Greeting by time of day. | Working | — |
| Filter button | Shows/hides category pills. | Working | — |
| Category pills (All, Sports, Technology, Personal, Food, Hotels, Animals, Discovery, Cars, Travel, Science, Movies) | Filter posts. | Partial | Filtering is in the browser with a fake loading delay; not remembered. New user posts always go to "Personal". |
| Empty category | — | Not built | Blank area, no message. |

### 5.3 Post card

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Avatar and name | Open the creator's profile. | Working | — |
| Feeling / location / tagged people line | From the saved post. | Working | Tagged names are not links. |
| Subscriber crown | Shown if you subscribe to the creator. | Working | — |
| Verified badge | From the creator record. | Working | — |
| Follow / Following | Follow saves at once; Following asks "Unfollow?". | Working | Failures show a browser alert box. |
| Handle and time | Shows the stored time label. | Partial | New posts show "Just now" forever. |
| Globe icon | Suggests the post is public. | Simulated | Decoration only; no audience setting. |
| Three-dot "More options" | — | Placeholder | Does nothing. |
| X menu > Remove this post from my feed | Hides the post for you permanently. | Working | — |
| X menu > Delete my post completely | Confirms, then deletes your post. | Working | — |
| Report, Save, Copy link, Edit post, Mute, Block | — | Not built | — |
| Tags | Shown as chips. | Partial | Not clickable; no hashtag page. |
| Text | Post text. | Working | No "see more", links or @mentions. |
| Single image / collage | Open the photo viewer. | Working | Seeded photo posts can play a shared sample video. |
| Video | Muted autoplay preview; opens viewer. | Working | Mute badge does nothing. |
| Members-only lock | Blurs media and disables comments/viewer. | Partial | **Nobody can unlock it** — not subscribers, not the author. No Subscribe button on the lock. |
| Audio post player | See section 7.7. | Simulated | No sound. |

### 5.4 Post action bar

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Reaction button (click = ❤️, hover/long-press = picker) | Count goes up on screen. | Simulated | Not saved; resets on reload. |
| Reaction picker (Love, Like, Care, Haha, Wow, Sad, Angry) | Sets the reaction on screen. | Simulated | Not saved. |
| Comment button + count | Opens the comments panel. | Partial | Count is stored sample data; comments are generated (5.6). |
| Share | — | Placeholder | Does nothing. |
| Bookmark | Toggles on screen. | Simulated | Not saved; no saved-items page. |
| Like count | Shows stored count. | Partial | Fixed numbers; never change. |

### 5.5 Rails inside the feed

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Top Creators rail (after 1st post) | Creator cards with listener counts; card opens profile. | Simulated | Fixed list and numbers. |
| Top Creators > Follow | Saves a real follow. | Partial | Works only for creators that exist in the database. |
| Snaps rail (after 9th post) | "Because you watched Dua Lipa" + 6 snap tiles. | Placeholder | Fixed data; tiles and "See all" go nowhere. |
| Right rail (Suggested people, Trending hashtags) | — | Placeholder | Hidden on the home feed. When shown: fixed data, Follow not saved, "See all" goes nowhere. |

### 5.6 Photo / video viewer and comments

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Close (X / Esc / backdrop) | Closes the viewer. | Working | — |
| Photo carousel (counter, previous/next, arrow keys) | Browse post photos. | Working | — |
| Video player | Plays with sound and controls. | Working | Usually a sample clip for seeded posts. |
| Author header, tags, text | Post details; author links to profile. | Working | — |
| Viewer reaction | Toggle on screen. | Simulated | Not saved. |
| Viewer comment / share buttons | — | Placeholder | Do nothing. |
| Comment sort (Most relevant, Newest, All) | Reorders the list. | Simulated | Sorts generated comments. |
| Comment list with replies and likes | Shows comments. | Simulated | Made-up names and text. |
| Comment reaction | Toggle on screen. | Simulated | Not saved. |
| Reply | — | Placeholder | Does nothing. |
| "Add a comment…" + Post | Clears the box. | Simulated | Comment is not saved or shown. |

### 5.7 Scrolling

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Load more on scroll | Shows 10 more posts at a time with a loading shimmer. | Simulated | All posts already loaded; delay is fake. |
| Back-to-top button | Scrolls to top. | Working | — |
| Feed ordering | Fixed order, newest user posts at top. | Partial | No ranking, personalisation or "Following only" view. |

---

## 6. Create Post

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Ways in | Create button (desktop), + (mobile), "Share your first post" card on your profile. | Working | No composer box at the top of the feed. |
| Close (X / Esc / backdrop) | Closes the composer. | Working | No "discard draft?" warning; drafts not saved. |
| Text box | Up to 2,000 characters. | Working | No visible character counter. |
| Hashtags | `#words` become tags (up to 8). | Partial | No autocomplete; tags not clickable; no @mentions. |
| Photo/video picker | Up to 6 photos (8 MB each) or 1 video (25 MB). | Working | Can't mix photos and video. |
| Photo safety check | Each photo checked before upload; flagged photos are refused with a reason. | Working | Blocks all photos if the safety service isn't configured. |
| Video safety check | — | Not built | Videos are not checked. |
| Previews + remove (X) | Thumbnails with remove. | Working | Can't reorder photos. |
| Image editor: crop (Free, Original, 1:1, 4:5, 16:9), drag/resize, rotate, Save | Edits and re-uploads the photo. | Working | No zoom, flip, filters or alt-text editing. |
| Tag people | Live search of real users; removable chips; saved. | Partial | Tagged people aren't notified or linked. |
| Feeling / activity | 12 feelings, 8 activities; saved. | Working | No custom feelings. |
| Check in (location) | Real place search; saved. | Working | No map preview. |
| GIF | Search a short built-in list of GIFs. | Simulated | Not connected to the live GIF service. |
| More (···) | Lists the same options. | Working | Nothing extra. |
| Exclusive content (members-only) | Verified creators only. | Partial | Members-only posts can't be unlocked by anyone. |
| "Also push to" Facebook / Instagram / X / LinkedIn | Toggles on screen. | Placeholder | "Cross-posting is not live yet." |
| Audience / privacy selector | — | Not built | All posts public. |
| Audio upload | — | Not built | — |
| Post button | Publishes; text is moderated; post pinned at top of your profile. | Working | Can't post only a feeling/place. No success message, scheduling or editing after posting. |
| Text moderation warning | "Your post was not published" with reason. | Working | Blocks every post if the safety service isn't configured. |
| "Share on social" prompt (on your profile) | Copies an invite message with your profile link. | Partial | Social icons are not links. |

---

## 7. Audio

All content on the Audio page is hardcoded sample data, and **no player anywhere makes a sound** — every "play" just moves a progress bar with a timer.

### 7.1 Audio page — shared parts (all filters)

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Filter pills (All, Podcasts, Audiobooks, Music) | Switch the page between four dashboards. | Working | Choice resets on reload; can't be linked to. |
| Search box | Placeholder text changes per filter. | Placeholder | Typing does nothing; no results. |
| Spotlight hero carousel (3 slides) | Auto-rotates every 8 seconds; pauses on hover; swipe on mobile; dot indicators. | Working | Slides are sample data. |
| Spotlight > Play Now | Starts the track in the dock player. | Simulated | No sound. |
| Spotlight > "N friends are listening" | Social-proof line with avatars. | Simulated | Fixed numbers and initials. |
| Live drop / live room cards > countdown | "Starts in mm:ss", then "Live now". | Simulated | Timer restarts on each reload; no live room exists. |
| Live drop > Remind Me 🔔 | Changes to "Reminder set". | Simulated | Not saved; no reminder sent. |
| Creator cards > click | Opens the creator's profile. | Partial | Only 5 of 21 creators exist; others show "profile unavailable". |
| Creator cards > Follow / Unfollow | Saves a real follow. | Partial | Only works for the 5 real creators; always shows "Follow" after reload. |
| Back to top / left and mobile menu | Navigation. | Working | — |

### 7.2 Audio page — "All" filter

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Browse by mood (8 tiles: Deep Focus, Trending Now, Chill Down, Workout, Commute, Late Night, Storytime, Live Sets) | — | Placeholder | Do nothing when clicked. |
| Continue listening > See all | — | Placeholder | Goes nowhere. |
| Continue listening > resume cards + play | Start the track from a saved point. | Simulated | No real listening history; progress never saved. |
| For you (19 cards) | Click plays in the dock. | Simulated | Not personalised; last 2 repeat the first 2. |
| For you > Like / Bookmark | Toggle on screen. | Simulated | Not saved; counts never change. |
| For you > comments count, "Shared by" chip | Display only. | Simulated | No comments exist. |
| For you > pager | Pages 6 cards at a time. | Working | — |
| Top Creators (6 cards) | See shared creator cards. | Partial | — |
| Trending Audio Challenges (4 cards + submission counts) | Display challenges. | Simulated | Fixed counts. |
| Join Challenge 🎙️ | — | Placeholder | Does nothing; no recording or upload. |
| Upcoming Live Drops (3 cards) | Countdown + Remind Me. | Simulated | — |
| Top Music Chart > Global / Friends / Colombo | Re-ranks the chart. | Simulated | Fixed lists; no real friends or location data. |
| Top Music Chart > Right Now / Weekly / All-Time | Re-sorts by fixed numbers. | Simulated | — |
| Top Music Chart > vibe chips (All, Workout, Focus, Late Night, Viral on Feed) | Moves matching rows to the top. | Simulated | — |
| Top Music Chart > 10 rows (click to play) | Plays the row in the dock. | Simulated | **Defect:** most rows play the wrong song; chart includes a podcast and an audiobook. |

### 7.3 Audio page — "Podcasts" filter

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Spotlight hero | 3 podcast slides. | Simulated | — |
| Browse topics (8 tiles) | — | Placeholder | Do nothing. |
| Continue listening (See all + 4 cards) | Resume cards. | Simulated | "See all" goes nowhere. |
| For you (6 cards, like, bookmark) | Click plays. | Simulated | — |
| New episodes (6 cards) | Click plays. | Simulated | No "shows you follow" behind it. |
| Top shows (5 cards) | Click plays one episode. | Simulated | No show or episode-list page. |
| Top hosts (5 creator cards) | Creator cards. | Partial | Only 2 resolve to real profiles. |
| Live podcast rooms (3 cards) | Countdown + Remind Me. | Simulated | — |
| Top Podcasts chart (10 rows) | Click plays. | Simulated | **Defect:** ranks 6–10 repeat ranks 1–5. |

### 7.4 Audio page — "Audiobooks" filter

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Spotlight hero | 3 slides. | Simulated | — |
| Browse genres (8 tiles) | — | Placeholder | Do nothing. |
| Continue listening (chapter progress) | Resume cards. | Simulated | "See all" goes nowhere. |
| New titles (6 cards) | Click plays; like, bookmark. | Simulated | — |
| Popular titles (5 cards) | Click plays. | Simulated | No book detail, chapters, purchase or library. |
| Top authors (5 creator cards) | Creator cards. | Partial | Only 1 resolves. |
| Book clubs & live rooms | Countdown + Remind Me. | Simulated | — |
| Top Audiobooks chart (10 rows) | Click plays. | Simulated | **Defect:** ranks 6–10 repeat ranks 1–5. |

### 7.5 Audio page — "Music" filter

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Spotlight hero | 3 slides. | Simulated | — |
| Browse genres (8 tiles) | — | Placeholder | Do nothing. |
| Continue listening | Resume cards. | Simulated | "See all" goes nowhere. |
| New releases (7 cards, 2-page pager) | Click plays; like, bookmark. | Simulated | Pager works. |
| Featured albums (7 cards) | Click plays a lead track. | Simulated | No album/tracklist page; one album plays a song from another album. |
| Top artists (5 creator cards) | Creator cards. | Partial | Only 2 resolve. |
| Live music rooms | Countdown + Remind Me. | Simulated | — |
| Top Music Chart | Same as "All". | Simulated | Same wrong-song defect. |

### 7.6 Audio page players (dock and full screen)

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Dock player (appears after any play) | Artwork, title, creator; click opens full screen. | Working | — |
| Progress bar + time | Fills over time. | Simulated | No sound; can't click to seek. |
| Skip back / forward 15 s | Moves the fake position. | Simulated | — |
| Play / Pause | Starts/stops the timer. | Simulated | — |
| Like (music only) | Toggle heart. | Simulated | Not saved. |
| Close (X) | Stops and hides the dock. | Working | — |
| Previous / Next track | — | Not built | No buttons. |
| Full-screen player: close / Esc | Closes. | Working | — |
| Full-screen: scrubber, skip, play/pause, like | Same as dock; click scrubber to jump. | Simulated | No drag or keyboard seek. |
| Volume, queue, share, lyrics, speed, shuffle, repeat, sleep timer, download, cast | — | Not built | — |
| Playback across pages | — | Not built | Audio page and home feed use separate players. |

### 7.7 Audio in the home feed

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Audio posts | 50 sample audio posts with artwork, title, show name, duration. | Partial | No audio files attached; users can't create audio posts. |
| Type badge (Podcast / Audio) | From the post tags. | Working | — |
| Play / Pause, skip ±15 s, progress bar | Starts the fake timer and the mini player. | Simulated | No sound; can't seek. |
| Mini player (artwork, progress, skip, play/pause, like, close) | Docked while browsing; opens full screen. | Simulated | Like not saved. |
| Full-screen player | Same as Audio page full screen. | Simulated | — |
| "Audio" category filter | — | Not built | — |

---

## 8. Photos, Videos, Snaps

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Photos page | "Coming soon" message. | Placeholder | No grid, viewer, filters or upload. |
| Videos page | "Coming soon" message. | Placeholder | Same. |
| Snaps page | "Coming soon" message. | Placeholder | Same; no snap creation or viewer. |
| Mobile "Media" tab | Opens the four media pages. | Working | — |

---

## 9. Profiles & My Account

### 9.1 Public profile

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Back arrow | Returns to the feed. | Working | — |
| Cover image | Shows the creator's banner. | Working | — |
| "Upload banner" (verified owner, no cover) | Links to Seller Tools banner page. | Working | No inline upload. |
| Bag button + count (if creator has a shop) | Opens the shopping bag. | Simulated | Bag stored in the browser only. |
| Share profile | — | Placeholder | Does nothing. |
| Avatar, name, @handle, Verified badge, bio | Profile details. | Working | — |
| Posts count | Live count. | Working | — |
| Followers / Following / Subscribers counts | Show numbers. | Simulated | Fixed text; don't change when you follow or subscribe. |
| Subscribe (with price) | Creates an active subscription. | Partial | **No payment**; doesn't unlock members-only posts. |
| Notification bell / menu (All, Personalised, None) | Saves notification preference. | Working | No notifications are ever sent. |
| Unsubscribe | Cancels the subscription. | Working | No confirmation step. |
| Follow / Following (with "Unfollow?") | Saves follow. | Working | — |
| Collection (bag) icon | Opens the shop, or "unavailable" if switched off. | Working | — |
| Message icon | Opens or creates a chat. | Working | — |
| Special Requests floating button | Opens the booking page; draggable. | Working | Position not remembered. |
| Profile tabs | — | Not built | One scrolling page: Collection, Popular posts, Feed. |
| Collection preview strip | Links to shop and products. | Working | — |
| Popular posts | Cards with image, lock, title, likes, comments. | Simulated | Fixed data; not clickable. |
| Profile feed | Same post cards as the home feed. | Partial | Same limits as section 5.3–5.4. |
| Owner: "Create your first post" card | Opens Create Post. | Working | Dismissal saved in browser only. |
| Owner: "Tell your people" share card | Copies an invite message. | Partial | Social icons aren't links. |
| Unknown profile | "This account is no longer on InrCliq". | Working | — |

### 9.2 My account

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Avatar + edit pencil + photo editor (crop, rotate) | Uploads and saves a new avatar. | Working | No remove-photo option; avatar not safety-checked. |
| Name, verified star, account-type / privacy chips | Account details. | Working | — |
| Family Circle shield (guardians) | Opens Family Circle. | Working | — |
| "No handle set" + Set now | Popup to choose a handle. | Working | — |
| Change an existing handle | — | Not built | — |
| Guardian card (minors) + Message | Shows guardian; opens chat with them. | Working | — |
| Globe (view public profile), Edit pencil | Navigation. | Working | — |
| Setup prompts (handle → first post → share) | One prompt at a time. | Working | Dismissal saved in browser only. |
| Followers tab | Real list. | Partial | Only filled for creator-linked users; no follow-back button. |
| Following tab + Unfollow | Real list; unfollow saved. | Working | — |
| Subscriptions tab | Real list with notification level. | Partial | No manage/unsubscribe here. |
| Posts tab | — | Not built | — |
| Edit profile page | Shows name, handle, email, DOB, location, join date, account type, privacy. | Partial | **View only** — nothing can be edited (no name, bio, etc.). |

---

## 10. Creator Shop (Collection)

### 10.1 Storefront

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Header (cover, avatar, title, counts, subtitle) | Shop details. | Working | — |
| Bag button | Opens bag. | Simulated | Browser only. |
| Share collection | — | Placeholder | Does nothing. |
| Filter: All / Physical / Digital | Filters products. | Working | — |
| "Showing X of Y" | Count. | Working | — |
| Load more on scroll | 8 at a time with skeletons. | Simulated | All loaded already; delay is fake. |
| Product card: image, badges, name, price, offer, discount | Product summary. | Working | Rating and "sold" are stored text, not real stats. Offer tooltip mentions the same creator name for every shop. |
| Product card: like heart | Toggle on screen. | Simulated | Not saved. |
| Product card: Add to bag | Adds to the bag and opens it. | Simulated | Browser only. |
| Shop switched off | "Unavailable" page with Message creator. | Working | — |

### 10.2 Product page

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Gallery, thumbnails, full-screen view | Browse images. | Working | — |
| Like | Toggle on screen. | Simulated | Not saved. |
| Price, discount, title, description | Product details. | Working | — |
| Share product | — | Placeholder | Does nothing. |
| Colour swatches and sizes | Choose variant (recorded on bag line). | Working | — |
| Quantity selector | — | Not built | Always adds 1. |
| Buy now | Opens the bag. | Partial | Doesn't go straight to checkout. |
| Add to bag / Pre-order | Adds to bag. | Simulated | Browser only. |
| Delivery location + edit pencil | Shows a fixed location. | Placeholder | Pencil does nothing. |
| Delivery fee, cash-on-delivery, returns, warranty, buyer protection | Information text. | Simulated | Fixed copy. |
| Ratings & reviews (average, Fit/Quality/Value, review cards, show more) | Shows reviews. | Simulated | Generated reviews for most products. |
| Write a review | — | Not built | — |
| Related products | — | Not built | — |

### 10.3 Bag and checkout

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Bag: items, − / + quantity | Edit the bag. | Simulated | Browser only; no explicit Remove button. |
| Promo code | Applies SAVE10 or WELCOME5. | Simulated | **Defect:** any other code shows "applied" with $0 off. |
| Subtotal, delivery ($7 flat for physical), total | Order maths. | Simulated | Always shows $. |
| Checkout button | Opens checkout. | Working | — |
| Shipping address + Change | Prefilled demo address; editable inline. | Simulated | Not saved; no validation. |
| Shipment / digital delivery groups, arrival estimate | Order summary. | Simulated | — |
| Payment: credit card or cash on delivery | Choose method. | Simulated | No payment provider. Invalid card silently does nothing. |
| Place order → "Order placed" screen | Shows success. | Simulated | **No order saved, no payment, no email, seller never sees it, bag not emptied.** |
| Order history / seller order management | — | Not built | — |

---

## 11. Special Requests (Fan side)

### 11.1 Request landing page

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Intro + "Book with {name}" | Starts the booking wizard. | Working | — |
| Rating and bookings line ("★ 4.x · N bookings") | Social proof. | Simulated | Generated numbers. |
| Examples carousel (auto-rotate, arrows, dots, "Book this") | Shows example work; "Book this" preselects the offering. | Working | Play icon does nothing (no video). |
| How it works, starting price, response time, next available, guarantee | Information from the creator's setup. | Working | Text entered by the creator, not calculated. |
| Secure payment logos | — | Placeholder | Shows payment brands not offered at checkout. |
| Ratings & reviews (bars, star filter, sort, show more) | Review list. | Simulated | Generated reviews; same text for every creator. |
| Mobile "Book now" bar | Starts booking. | Working | — |
| Requests switched off | "Unavailable" page. | Working | — |

### 11.2 Booking wizard (4 steps)

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Step tracker (Occasion / Request / Personalize / Review & Pay) | Shows progress; jump back to completed steps. | Working | Refreshing the page loses entries. |
| **Occasion:** category tiles (Instant vs Needs approval badge, "From $X") | Choose a category. | Working | — |
| **Request:** offering list + details panel (about, included, booking & payment, licensing) | Choose an offering. | Working | — |
| **Request:** audio sample | Plays. | Working | — |
| **Request:** video sample | Poster image only. | Placeholder | Play does nothing. |
| **Request:** summary (price, response, 5% fee notice) | Explains cost. | Working | — |
| **Personalize:** delivery (DM clip and/or tagged feed post +$15) | Choose delivery. | Partial | Feed post only adds the fee; no way to pick or tag the post. |
| **Personalize:** format (Text / Audio / Video), tone, length (+price), framing, captions | Options the creator enabled. | Working | — |
| **Personalize:** date calendar | Past, too-early and creator-blocked dates disabled. | Working | — |
| **Personalize:** time | 5 fixed time slots. | Partial | Creator's hourly availability not used. |
| **Personalize (appearances):** occasion, location search, duration, expectation | Event details. | Working | — |
| **Personalize (appearances):** reference file | Attach a file. | Partial | Only the file name is sent; file is never uploaded. |
| **Personalize:** recipient (me / someone else), name, @username, message, instructions | Message details. | Working | @username not checked against real accounts. |
| **Personalize:** validation + price breakdown | Highlights missing fields; shows totals. | Working | — |
| **Review & pay:** review sections with Edit buttons | Check and edit. | Working | — |
| **Review & pay:** terms checkbox | Required for approval bookings. | Partial | Terms link often goes nowhere. |
| **Review & pay:** Pay / Proceed to payment | Opens checkout. | Partial | **Defect:** price is passed in the page address and trusted by the server, so it can be changed. |

### 11.3 Request checkout

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Summary (amount, line items, "Due now" 5% fee or full total) | Shows what is paid now. | Working | — |
| Back | Returns to the wizard. | Partial | Wizard entries are lost. |
| Saved card / new card fields | Choose card. | Simulated | Saved card is hardcoded; card details never sent. |
| Country of origin | Required. | Partial | Not saved. |
| Pay | Creates a real booking, re-checks the date is free, and posts a booking card into both people's chats. | Partial | **No payment is taken** despite "Payment confirmed". |
| Success + redirect to Messages | Opens the booking in chat. | Working | — |

---

## 12. Messages

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| New message (+) | — | Placeholder | Does nothing; no way to start a chat from here. |
| Search | Filters threads by name, handle or last message. | Partial | Doesn't search full message history. |
| Thread list (avatar, name, time, preview, unread badge) | Opens a chat and marks it read. | Working | — |
| Online status | Shows "· Online" in the chat header. | Simulated | Fixed demo flag; no real presence. |
| Links from profiles / bookings | Open the right chat or booking card. | Working | — |
| Chat header (avatar, name → profile, handle) | Details. | Working | — |
| Menu > Clear messages | Deletes your copy of the messages. | Working | — |
| Menu > Delete chat | Removes the conversation. | Partial | Deleted demo chats come back. |
| Message bubbles with time | Message history. | Working | — |
| Booking cards and status notes (accepted, declined, delivered, offer, counter, refund…) | Booking updates in chat, linking to Calendar. | Working | — |
| Text box + Send | Sends and saves; delivered to real users. | Working | Demo creators never receive or reply. |
| Safety warnings, held/hidden messages, restriction banners | See section 16. | Working | — |
| Emoji picker, photo/file attachments, GIFs | — | Not built | Messages are text only. |
| Live updates | Refreshes every 4 seconds. | Partial | Polling, not real-time. |

---

## 13. Calendar (Bookings)

### 13.1 Header and tabs

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Title and subtitle | Mentions "alerts, events, bookings and requests". | Partial | Only bookings appear. |
| Billboard tab | Month calendar of all bookings. | Working | — |
| My Requests tab | Bookings you made. | Working | — |
| Commitments tab | Bookings you received (verified creators). | Working | Greyed out with a tooltip for non-verified users. |

### 13.2 Billboard calendar

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Filter chips (All / Commitments / My Requests) | Filter the calendar. | Working | Commitments chip still shows for non-verified users. |
| "N this month" count | Count of shown bookings. | Working | — |
| Previous / next month | Change month. | Working | No "Today" button or week view. |
| Day cells + booking chips (up to 2, "+N more") | Coloured by status; select a day. | Working | Chips themselves aren't clickable. |
| Selected-day list | That day's bookings; click opens details. | Working | — |

### 13.3 My Requests and Commitments lists

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Booking card (avatar, request, status, ref, name, total, dates, format) | Booking summary. | Working | — |
| Inline action buttons | Same actions as the details drawer. | Working | — |
| Delivery countdown | Shown once accepted. | Working | — |
| Feedback button / star chip | Give or view feedback. | Working | — |
| Deliver / Mark as completed | Opens the delivery page. | Working | — |
| Messages link | Opens the chat. | Working | — |
| Details | Opens the details drawer (linkable). | Working | — |

### 13.4 Details drawer

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Header, counterpart, status badge | Booking summary. | Working | — |
| Countdown ("committed to deliver in" / "you will receive in") | Days, hours, minutes. | Working | Stops at zero with no "overdue" warning. |
| Service details (type, category, occasion, formats, tone, delivery, recipient, message, totals, offers, notes, location…) | Full booking details. | Working | Attachments show name only — no download link. |
| Dates (created, deliver by, accepted, declined + reason) | Timeline. | Working | Refund amount not shown. |
| Open messages | Opens chat. | Working | — |

### 13.5 Booking actions

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Instant booking — creator Accept (note) / Decline | Accept starts the countdown (default 7 days). | Working | Instant bookings are **not** auto-accepted after payment. |
| Approval booking — creator Send new offer (price + note) / Decline | Starts negotiation. | Working | No currency choice. |
| Decline with reason | Reason required; refund recorded. | Partial | No money moves. |
| Fan: Accept offer → pay balance | Opens balance checkout. | Working | Payment simulated (13.7). |
| Fan: Counter offer (price + note) | Sends a counter-offer. | Working | One counter round only. |
| Fan: Decline offer | Declines. | Working | — |
| Creator: Accept / Decline counter | Declining restores the original offer. | Working | — |
| Creator: final Accept after balance paid | Starts the countdown. | Working | — |
| Feedback (1–5 stars, quick picks, note) | Each side rates once. | Partial | Can't edit; can't see the other side's feedback; not shown on public profiles or ratings. |
| Status notes in chat + pop-up messages | Every action posts a note in Messages. | Working | — |
| Fan cancel / creator cancel / auto-expiry if no response | — | Not built | "In Progress", "Cancelled" and "Counter offer" statuses exist but are never used. |
| Booking emails / reminders | — | Not built | — |

### 13.6 Deliver page

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Request details | Summary of the booking. | Working | — |
| Delivery file upload (replace / remove) | PDF, Word, text or image up to 10 MB. | Partial | **Audio and video files not accepted**, though offerings sell them. One file only. |
| Note to fan | Saved with the delivery. | Working | — |
| Submit | Marks Delivered and returns to Calendar. | Working | — |

### 13.7 Balance payment page

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Summary (deposit paid, balance due) | Real calculation. | Working | Always shows $. |
| Saved card / new card / billing country | Payment form. | Simulated | Not sent anywhere. |
| Terms checkbox | Required. | Partial | No terms link. |
| Pay | Marks the balance paid ("Awaiting acceptance"). | Simulated | No real payment. |

---

## 14. Seller Tools

### 14.1 Becoming a verified creator

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| "Unlock Seller Tools" page (non-verified users) | Explains the two ways to get verified. | Working | — |
| Path 1: follower progress ("n / 50,000" + bar) | Real follower count. | Partial | Reaching 50,000 does nothing automatically. |
| "Grow on the feed" | Goes to the feed. | Working | — |
| Path 2: $12.99/month + Subscribe | Opens membership checkout. | Working | — |
| Benefit tiles (merch, exclusive content, fan subscriptions, service requests) | Information. | Partial | Exclusive content unlock and fan subscriptions don't exist yet. |
| Membership checkout (card, country, terms, Subscribe) | Marks the user verified and sets up their seller pages. | Simulated | "Demo mode — no card is charged." No renewal, cancel, expiry or receipt. |
| Admin verify / unverify | — | Not built | — |

### 14.2 Seller dashboard

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Side menu (Dashboard, Collection, Service requests, Subscriptions, My Money, Settings) | Navigation. | Working | Subscriptions and My Money are placeholders. |
| Collection card: products (physical/digital) | Real counts. | Working | — |
| Collection card: Sold, Rating | Shows numbers. | Simulated | Taken from product text labels, not real orders. |
| Service requests card: Awaiting, Completed, Live categories/offerings | From real bookings. | Partial | "Completed" also counts accepted and in-progress bookings. |
| Service requests card: Earnings | Sum of booking totals. | Partial | Not money actually received. |
| Views bar chart (with revenue tooltip) | Daily views and revenue. | Partial | **Views are made up**; revenue is real booking totals. |

### 14.3 Collection setup

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Intro: Add your first product / Review page setup | Getting started. | Working | Intro returns on reload. |
| Intro video | — | Placeholder | "Video coming soon". |
| Preview storefront | Opens the public shop. | Working | — |
| Summary strip (Live/Hidden, Products, Ready) | Status at a glance. | Working | — |
| Setup tab: Show Collection on profile | Turns the shop on/off. | Working | Needs at least one complete, published product. |
| Setup tab: title, subtitle, Save setup | Shop heading. | Working | — |
| Products tab: product rows + readiness badge (Ready / Draft / Needs setup / Inactive) | Product list. | Working | — |
| Products tab: Manage / Deactivate / Activate | Manage products. | Working | — |
| Reorder, search, duplicate, stock, orders list | — | Not built | — |

### 14.4 Add / edit product

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Name, kind (Physical / Digital) | Basic details. | Working | Digital products have no file to download. |
| Price, compare-at price | Pricing. | Partial | Free text; no number check or currency. |
| Button label, image alt text, short and long description, headline | Product copy. | Working | — |
| Main image (required, up to 5 MB) | Upload / replace / remove. | Working | No crop tool. |
| Gallery images + alt text | Extra images. | Working | No reordering. |
| Publish toggle | Publish when name, price, description and image are set. | Working | — |
| Offer badge, offer detail, discount label | Promotion text. | Partial | Text only; no discount calculation. |
| Sizes (physical) | Add / remove sizes. | Working | Can't choose default. |
| Colours (physical) | Add colour name and hex code. | Partial | No colour picker; can't set a colour-specific image. |
| Ship from, delivery fee, returns, warranty | Delivery information. | Partial | Free text; not used by checkout. |
| Cash on delivery toggle | Saved. | Partial | Not used by checkout. |
| Delete (type product name to confirm) | Deletes the product. | Working | — |
| Stock, SKU, weight, shipping regions | — | Not built | — |

### 14.5 Service requests

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Intro: Create first category / Review setup | Getting started. | Working | — |
| Intro video | — | Placeholder | "Video coming soon". |
| Preview page | Opens the public request page. | Working | — |
| Summary (Storefront, Offerings, Awaiting, Starting from) | Status at a glance. | Working | — |
| **Calendar tab:** month view, booking chips, day list | Bookings by date. | Working | — |
| **Calendar tab:** Block days (click, shift-click range, Mark unavailable / Make available) | Blocks days for fan booking. | Working | Past blocked days can't be unblocked. |
| **Offerings tab:** category rows (readiness, Instant/Approval badge, counts) | Category list. | Working | — |
| **Offerings tab:** Manage / Deactivate / Activate | Manage categories. | Working | No reordering. |
| **Offerings tab:** Requests, Pending, Completed, Earnings | From real bookings. | Working | — |
| **Offerings tab:** Views, Reviews / rating | Shows numbers. | Simulated | Made-up numbers. |
| **Inbox tab:** request table (ref, request, fan, total, deliver by, status) | Incoming requests; row opens Calendar. | Working | No filters or paging. |
| **Inbox tab:** Accept | Accepts a request. | Partial | **Defect:** fails for approval-type bookings (no Send offer here). |
| **Inbox tab:** Decline (reason) | Declines. | Working | — |
| **Setup tab:** Show Special Requests on profile | Turns requests on/off. | Working | — |
| **Setup tab:** response time, next available, starting range, intro, guarantee | Page copy. | Partial | "Next available" is free text; starting range overwritten automatically. |
| **Setup tab:** example gallery slides (image, caption, alt text) | Example work carousel. | Partial | Linked category/offering can't be chosen. |

### 14.6 Categories and offerings

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Category: title, intent, icon (gift / coach / stage), blurb, background image, popular | Category details. | Working | Icon shown as a name, no preview. |
| Category: Instant booking toggle + tooltip | Marks instant categories. | Partial | **Defect:** tooltip says instant bookings are auto-approved — they are not. |
| Category: Delete (type name to confirm) | Deletes the category. | Working | — |
| Add offering | Enabled once the category has an image. | Working | — |
| Offering: preview image, name, popular, publish, description | Offering details. | Working | No video sample; no audio-sample upload. |
| Offering: min / max price | Price range. | Working | No currency choice. |
| Offering: delivery formats (Text / Audio / Video) | At least one required. | Working | — |
| Offering: per-format Length / Tone / Framing / Captions | Options shown to fans. | Working | Tone, framing and caption choices are fixed lists. |
| Offering: length options with add-on prices | Priced length choices. | Working | — |
| Offering: About, What's included | Description. | Working | Terms, licensing and turnaround not editable. |

### 14.7 Settings, banner, Subscriptions, Wallet

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Seller settings page | Links to profile banner, Collection setup, Service request tools, Account. | Working | No real settings (payouts, tax, notifications). |
| Public profile banner: upload, crop (16:9 etc.), rotate, remove | Saves the profile cover. | Working | Banner not safety-checked. |
| Subscriptions | "Feature not available". | Placeholder | No paid fan plans or subscriber list. |
| My Money / Wallet | "Feature not available". | Placeholder | No balance, transactions, payouts or withdrawals. |

---

## 15. Family Circle (Guardian Dashboard)

### 15.1 Layout and navigation

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Access | Guardians only; others are redirected. | Working | — |
| Header: logo, Activity icon, Back to feed | Navigation. | Working | — |
| Header: Activity red dot | Shown whenever a child is linked. | Simulated | No read/unread tracking. |
| Menu: Overview, Linked accounts (with child avatars), Controls, Safety alerts, Requests | Navigation. | Working | — |
| Safety alerts badge | Real unresolved count; refreshes every 30 s. | Working | — |
| Requests badge | Always "1". | Simulated | — |

### 15.2 Overview

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Welcome greeting | Personalised. | Working | — |
| Linked accounts card | Real count and avatars. | Working | — |
| Unresolved alerts card | Real count. | Working | — |
| Pending requests card | Always 1. | Simulated | — |
| Controls healthy card | Always "all healthy". | Simulated | No real health check. |
| Recent safety alert + View all | Latest real alert. | Working | — |
| Threat Radar: child switcher | Choose which child to view. | Working | — |
| Threat Radar: four rings (Immediate family, Relatives, School friends, Approved friends & adults) | Child's contacts placed in rings. | Partial | Default ring is guessed from a name list. |
| Threat Radar: drag contact to another ring + confirm | Saves the contact's ring. | Working | Mouse only; not logged in Activity; rings don't change who can message the child. |
| Threat Radar: contact trust score + warnings | Score out of 100. | Simulated | Made-up numbers. |
| Threat Radar: red "Danger — needs review" contact | One contact per child. | Simulated | Deliberately forced for demo. |
| Threat Radar: click contact / legend filter / View contacts | Navigation and zoom. | Working | — |
| Recent requests panel | Demo request card. | Simulated | — |

### 15.3 Linked accounts list

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Safety score ring + popover | Score per child. | Simulated | Made-up; one demo child hardcoded to 33. |
| Avatar, name, handle → child page | Child details. | Working | — |
| Age zone badge, protection chip, linked date, status badge | Real details. | Working | — |
| DM contact avatars | Child's chat contacts. | Partial | Includes seeded demo chats. |
| Message child | Opens guardian–child chat. | Working | — |

### 15.4 Child detail

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Hero: avatar, name, Minor / Privacy / status chips | Child summary. | Working | — |
| Hero: Activity, Public profile, Message icons | Navigation. | Working | — |
| Activity tabs: counts | Real counts. | Working | — |
| Posts tab | Always "has not posted yet". | Not built | **Defect:** never lists posts even when the count is above 0. |
| Followers / Following / Subscriptions lists | Real lists. | Working | — |
| DM policy sentence | Text per protection level. | Simulated | Level doesn't actually limit DMs. |
| DM contact rows → contact page | Real chats. | Partial | Includes demo chats. |
| Change circle band (cog) | Saves contact's ring. | Working | Not logged in Activity. |
| Contact status (All clear / Attention needed) | — | Simulated | Made-up. |
| Account details (email, age, DOB, location, member since, linked, protection) | Real details. | Working | — |
| Change protection level / edit settings | — | Not built | — |

### 15.5 DM contact detail

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Contact hero (name, handle, last active, ring) | Contact summary. | Working | — |
| Status pill | — | Simulated | Made-up. |
| Conversation activity list | Recent activity. | Simulated | Generated from templates. |
| Restrict direct messaging | Saved, enforced and logged. | Working | Blocks both directions (description says only the child). |
| Require approval for messages | Saved. | Partial | **Not enforced.** |
| Block this contact | Saved, enforced and logged. | Working | No confirmation; same effect as Restrict. |
| View public profile | Opens profile. | Working | — |

### 15.6 Activity

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Safety entries (alert raised, viewed, allowed, rejected, expired, blocked, reported…) | Real safety log. | Working | — |
| Request / Controls / Account entries | Sample entries (screen time, control requests, etc.). | Simulated | Hardcoded. |
| Child filter | Via the child page link. | Working | No filter controls on the page. |
| Scroll for more | Reveals more entries. | Simulated | Already loaded; fake delay. |

### 15.7 Safety alerts

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Alert list (pending decisions pinned, then 50 most recent) | Real alerts. | Working | — |
| Alert card (priority, child + zone, sender, category, status, time) | Alert details. | Working | — |
| Safe preview box | Blurred box. | Placeholder | Decorative. |
| View message (warning → masked text) | Shows the message with contact details and explicit words hidden; logged. | Working | — |
| Allow | Delivers the held message; adds sender to approved ring for Kids. | Working | — |
| Reject | Message never delivered. | Working | — |
| Acknowledge | Marks informational alerts as seen. | Working | — |
| Block {sender} | Blocks the sender for the child. | Working | — |
| Report (reason + details) | Creates a safety report; urgent for serious Kids/Teens cases. | Partial | "Reported" label lost on reload; no staff screen to review reports. |
| Review DM settings / Message child links | Navigation. | Working | — |
| Auto-expiry after 7 days | Held messages expire. | Working | — |
| Email / push alerts to guardians | — | Not built | — |

### 15.8 Controls and Requests

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Controls: per-child Discoverability, Direct messaging, Safety alerts, Location sharing | Shows values. | Simulated | Fixed labels; nothing can be changed. |
| Requests: one demo request card | Shows a sample request. | Simulated | — |
| Requests: Review / Decline | — | Placeholder | Disabled. |
| Children requesting control changes | — | Not built | — |

### 15.9 The minor's own view

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Privacy chip + protection icon on own profile | Shows protection level. | Working | — |
| Guardian card + Message guardian | Opens chat with guardian. | Working | — |
| My Safety, My Controls, "what my guardian can see", appeals, help/report screens | — | Not built | — |

---

## 16. DM Safety & Content Moderation

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Message checks on send | Every DM checked against guardian blocks, sender restrictions, AI text moderation and (for minors) a grooming keyword list, then delivered, masked, blocked or held. | Working | Text only; image/video DMs not covered. |
| Sender warning to adults: "Edit message" / "Send anyway" | Shows category and severity; Send anyway is re-checked. | Working | — |
| Sender warning when recipient is a minor | Generic "Message blocked" (no details). | Working | — |
| "Can't be sent to this account" | Sexual content to a minor with no guardian; may auto-report sender. | Working | — |
| "Message not sent" + Try again | Safety check failed for a minor recipient. | Working | — |
| Sender bubble labels (Pending review, Not delivered, Shown masked) | Show message state. | Working | — |
| Recipient masked bubbles (Hidden for safety, Removed for safety, Hidden by safety filter) | Hide unsafe content. | Working | — |
| Hold for guardian review (up to 7 days) | Recipient's guardians decide; sender's guardians informed. | Working | — |
| Restriction banner (restricted by guardian / barred from messaging minors until a date) | Replaces the text box. | Working | — |
| Strikes (1 = warning, 2 = 7-day ban, 3 = indefinite ban) | Escalating limits on messaging minors. | Working | No admin screen to review or lift bans. |
| Strike notice | Dismissable notice. | Partial | Disappears on reload. |
| Daily clean-up job | Expires holds; deletes held text after 30–90 days. | Working | — |
| Post text moderation | Hate, self-harm, sexual, violence checks on posts and partner posts. | Working | Blocks all posts if the service isn't configured. |
| Image moderation | Composer photos only. | Partial | Videos, avatars, banners and partner media not checked. |
| Comment moderation | — | Not built | Comments aren't real yet. |
| Age-appropriate feed filtering | — | Not built | Minors see the same feed and can follow, subscribe and post freely. |
| Trust & Safety review console, mandatory reporting | — | Not built | Reports are recorded but not sent anywhere. |

---

## 17. Platform Admin (Settings)

### 17.1 Access and menu

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Unlock screen (password + Continue) | Grants admin access for 8 hours. | Partial | Single shared password stored in code; no admin accounts, roles or audit log; no limit on wrong attempts. |
| Menu: Dashboard, Users, Feed Mgmt, Partners | Navigation. | Working | — |
| Menu: Reset | Greyed out. | Placeholder | Switched off. |
| Lock / log out of admin | — | Not built | Access ends only after 8 hours. |

### 17.2 Dashboard — Users

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Total users (real vs demo vs AI) | Live count. | Working | — |
| New this week (+ 7-day mini chart) | Live count. | Working | — |
| Signed in now ("Live" badge) | Active sessions. | Partial | Snapshot at page load; doesn't refresh. |
| Email verified, Onboarding complete | Counts and percentages. | Working | — |
| New accounts, last 14 days (chart) | Daily signups. | Working | — |
| Account types, Age zones, Onboarding in progress, Parent approvals, Signup method | Breakdowns. | Working | — |
| Latest accounts (6) + View all users | Recent signups. | Working | Type doesn't distinguish adults and minors. |
| Date range, export, refresh | — | Not built | — |

### 17.3 Dashboard — Feed

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Total posts, Posted this week, Creators posting, Members-only posts, Hidden by viewers | Live counts. | Working | — |
| Posts per day, last 14 days | Chart. | Working | — |
| Categories, Post types | Breakdowns. | Working | — |
| Engagement (likes, comments, shares) | Totals. | Partial | Based on fixed sample numbers. |
| Most active creators, Latest member posts, Open Feed Mgmt | Lists and links. | Working | — |
| Bookings, revenue, shop or verified-creator metrics | — | Not built | — |

### 17.4 Users

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Tabs: Users / Demo users / AI Users (with counts) | Split accounts by type. | Working | — |
| Search (name, handle, email) | Filters the list. | Working | No sorting, paging or type filter. |
| Columns: Name, Handle, Email, Type, Feed posts | Account list. | Partial | Type doesn't distinguish adults and minors; no joined date or status. |
| Remove | Confirms, then permanently deletes the account and related data. | Partial | The user's feed posts stay in the feed. No undo. |
| Add AI user: auto-filled identity + Generate new | Random name, handle, email, date of birth (18 today), country. | Working | — |
| Add AI user: fields + Create AI user | Creates a verified adult account with a public profile. | Partial | No AI behaviour; can't sign in (example email). No "act as" tool. |

### 17.5 User detail

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Stats: Feed posts, Following, Chat threads, Signed in now | Activity summary. | Working | — |
| Account tab | Full account details. | Working | Read only. |
| Public profile tab | Profile details. | Working | Follower/subscription figures are display labels; read only. |
| Creator identity tab | Creator details with live followers/subscribers. | Working | — |
| Family tab | Parents, children, approval requests. | Working | No actions. |
| Feed posts table + Delete all posts | Lists and deletes the user's posts. | Working | No paging. |
| Edit, suspend, ban, verify, reset password, view bookings/messages | — | Not built | — |

### 17.6 Feed Mgmt

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Search, category filter, member/seeded filter | Find posts. | Working | — |
| Show more (50 at a time) | Paging. | Working | Loads all posts at once. |
| Post card: position, creator, tags, text, media links, location, feeling, engagement, dates, raw data | Full post details. | Working | — |
| Delete post | Confirms and deletes. | Working | — |
| Edit, hide, pin, reorder, bulk actions, moderation queue | — | Not built | — |

### 17.7 Seed sample settings

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Feed posts: counts (in file / in feed / missing) | Status. | Working | — |
| Delete seed sample (confirm + type random word) | Removes sample posts; member posts kept. | Working | — |
| Restore seed sample | Re-adds missing sample posts in order. | Working | — |
| Demo users: counts | Status. | Working | — |
| Delete demo users | Removes demo accounts. | Partial | Says their posts are removed — they stay. |
| Restore demo users | Recreates accounts, profiles and family links. | Working | No passwords; chats, follows and subscriptions not restored. |

### 17.8 Partners

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Add partner | Creates partner and first API key. | Working | No contact details or rename. |
| New key banner + Copy + Done | Key shown once. | Working | — |
| "Can post as" + Link creator (handle) + Unlink | Controls which creators a partner may post as. | Working | No search/autocomplete. |
| New key / Revoke | Issue and revoke keys; last-used time shown. | Working | Keys have no name, expiry or scope. |
| Delete partner | Deletes partner; posts stay. | Working | — |
| Integration Guide page (12 sections, copy buttons) | Partner-facing API documentation. | Working | No print/export button. |
| Partner post list, usage charts, request logs | — | Not built | — |

---

## 18. Partner Feed API

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Authentication | API key (only a secure hash stored); revoked keys rejected. | Working | — |
| Publish a post | Text, images, video or audio as a linked creator; text moderated; appears immediately. | Working | Media shown from partner links; not copied or image-checked. |
| Read / delete a post | For posts the partner published. | Working | No edit or "list my posts". |
| List creators | Creators the key may post as. | Working | — |
| Safe retries and limits | Duplicate-safe; 60 posts/minute; 100 KB body; backdate up to 30 days. | Working | No webhooks or sandbox. |

---

## 19. Platform & Infrastructure

| Feature | What it does | Status | Missing / not yet built |
|---|---|---|---|
| Demo password gate | Shared username/password on the hosted site. | Working | Not real access control. |
| Microsoft Clarity analytics | Production only. | Working | Not tied to consent. |
| Google Analytics | Loads on every environment. | Working | Not tied to consent; also loads locally. |
| Email (SMTP) | Sends account and approval emails; falls back to server log. | Partial | No booking, membership, order or safety-alert emails. |
| File storage | Vercel Blob (or local disk locally). | Working | — |
| Scheduled job | Daily DM-hold expiry and clean-up. | Partial | No booking expiry, reminders or refunds. |

---

## Known defects found during this review

| # | Area | Defect |
|---|---|---|
| 1 | Seller Tools > Service requests > Inbox | Accept fails for approval-type bookings ("Send a new offer first"), and the Inbox has no Send offer button. |
| 2 | Seller Tools > Category | Instant booking tooltip says bookings are approved automatically after payment; they are not. |
| 3 | Special Requests checkout | Booking total is passed in the page address and accepted by the server without recalculation. |
| 4 | Shop bag | Any unknown promo code shows as "applied" with $0 discount. |
| 5 | Shop checkout | Bag is not emptied after "Order placed". |
| 6 | Audio > Top Music Chart | Most rows play the wrong song; chart includes a podcast and an audiobook. |
| 7 | Audio > Top Podcasts / Top Audiobooks | Ranks 6–10 repeat ranks 1–5. |
| 8 | Home feed | Members-only posts can't be unlocked by subscribers or by the author. |
| 9 | Home feed / Create Post | New posts show "Just now" forever. |
| 10 | Family Circle > Child detail | Posts tab always says the child has not posted, even when they have. |
| 11 | Family Circle > DM contact | "Require approval for messages" is saved but not enforced. |
| 12 | Admin > Seed settings | "Delete demo users" says their posts are removed; they stay in the feed. |
| 13 | Guardian approval | Newly created guardian is not logged in after approval, so "Go to Family Circle" lands on the login page. |
| 14 | Onboarding > Interests | Chosen interests are thrown away. |

---

## Biggest gaps across the prototype

1. **Payments** — every payment is simulated: shop checkout, Special Request deposit and balance, refunds, Verified membership and creator subscriptions. No payment provider, wallet or payouts.
2. **Engagement** — reactions, comments, shares and bookmarks are not saved; like/comment counts are fixed.
3. **Notifications** — no notification centre, push or emails for bookings or guardian safety alerts.
4. **Search & discovery** — no global search or Explore; the feed is not personalised by interests or follows.
5. **Protection levels & age zones** — don't change what a child can see or do (apart from DM safety).
6. **Guardian identity verification** — ID and face scan are simulated.
7. **Trust & Safety back office** — no console for reports, strikes or bans; mandatory reporting not connected.
8. **Shop orders** — no order records, inventory or seller notifications.
9. **Members-only content** — cannot be unlocked.
10. **Media** — Photos, Videos and Snaps are placeholders, audio never plays, messages are text only.
11. **Profile editing** — users can't edit name, bio or an existing handle.
12. **Admin security** — single shared admin password; no admin roles or audit trail.
