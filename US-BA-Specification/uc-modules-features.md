# InrCliq MVP — modules and features

InrCliq’s 90-day MVP is a production social platform for Sri Lanka and India. People create real profiles, follow each other, publish photo, audio and video, and use feeds with recommendations, filters and search. They message each other safely. Children are protected by age zones and guardian controls from the first day. Creators earn through a shop and paid Special Requests.

The launch is designed for up to 100,000 monthly active users. A feature is done only when the rule is enforced on the server, web and mobile behave the same way, failures are handled, and the work has been tested. A working screen is not enough.

Priority in this list: **P0** must ship or the platform cannot launch safely. **P1** is the social experience. **P2** is what makes InrCliq different: audio, the shop, and Special Requests. All three are required for launch.

## Accounts and access (P0)

A person creates an account, proves the email is theirs, and comes back later without seeing anyone else’s private data.

- **Sign up and sign in** — The person signs up, signs in, signs out, and resets a password.
- **Email code login** — They can sign in with a short-lived email code, with limited attempts and a resend limit, or fall back to a password.
- **Email verification** — A new account confirms the email address before continuing.
- **Handle** — One handle is tied to the email. The same account model covers fans, creators, guardians, safety reviewers, and administrators.
- **Session** — The session is kept securely. Every protected action is checked on the server, so changing an id in the app cannot open someone else’s profile, messages, order, or admin screen.
- **Account status** — An account can be suspended, deactivated, or submitted for deletion.
- **Stronger checks** — Parents, guardians, administrators, and reviewers must pass a stronger identity check than a normal fan.

## Age zones and parental controls (P0)

Anyone under 18 is placed in an age zone, and a child cannot use the product as an adult until a guardian has approved them.

- **Date of birth and country** — Sign-up records the date of birth and the country. Age boundaries stay configurable because Sri Lanka and India may differ.
- **Age zones** — Kids have the tightest limits. Teens and Mature Teens get wider access under policy. Adults get the adult feature set.
- **Guardian invite** — A minor invites a guardian. The guardian can approve, reject, or recover the link. The minor stays restricted until approval.
- **Guardian status** — The product keeps the guardian relationship and sends the guardian the notices the policy requires.
- **Audit** — Approvals, rejections, guardian changes, policy changes, and restricted actions are kept permanently.
- **Rules engine** — A simplified RuleCore applies these permissions on the server. If age or guardian status cannot be confirmed, the case goes to manual review.

## Safety and moderation (P0)

Posts, products, comments, and messages are checked before people can treat them as normal content.

- **Screening** — Supported content is screened in-house (Tier-0) and by one approved outside provider (Tier-2), such as Azure AI Content Safety.
- **What is checked** — Posts, captions, images, audio, short and long video, comments, product listings, and direct messages, including order and booking messages.
- **Age filtering** — Content is filtered for the viewer’s age zone before it appears in a feed, search result, or discovery view.
- **Decisions** — A moderator can hold, reject, publish, or remove an item. Each decision has a reason code and an audit record.
- **Report and block** — Any user can report or block. Reports go to a Trust and Safety queue.
- **Serious events** — Defined serious cases are taken down quickly and the guardian is alerted.
- **Provider failure** — If the moderation provider is down, content is held or restricted. It is not published quietly.
- **Launch languages** — Safety is tested in English, Sinhala, Tamil, and Hindi.

## Security and privacy (P0)

The platform protects accounts, payments, and personal data well enough for a public launch.

- **Access control** — APIs and the web app check permission on the server. Data is encrypted in transit and at rest. Secrets and signing keys are stored securely.
- **Abuse limits** — Login, email codes, sign-up, posting, upload, search, checkout, and payment attempts are rate limited, with protection against bots.
- **Privacy** — People see a privacy notice and consent is recorded. They can ask to access, correct, or delete their data. Retention rules say how long data is kept.
- **Audit** — Sensitive actions are written to records that cannot be quietly changed.
- **Release safety** — The release pipeline scans dependencies, containers, and secrets. Backups are tested. Incident runbooks exist. A penetration test is done and critical findings are fixed before launch.

## Profiles and discovery (P1)

People can see who someone is, follow them, and find creators, posts, and products.

- **Profiles** — A normal profile and a creator profile. Each has a photo, display name, bio, and basic settings. Creators also have a banner. A profile can be public or restricted.
- **Follow** — A person can follow and unfollow, and can open following and follower lists.
- **Blocks** — A person can see who they have blocked.
- **Creator identity** — Creators are identifiable, their profiles can be reported, and people can discover them.
- **Search and filters** — Keyword search, creator categories, country and language, hashtags, recently active creators, popular creators, and creators the platform promotes by hand.

## Content creation (P1)

A creator publishes the formats people expect on a social platform. Audio is required at launch because it is part of what makes InrCliq different.

- **Posts** — Text and captions, photos, short video, long video, and audio. Each format has a size and duration limit.
- **Snaps** — Short snaps ship only if they are already far enough along and do not put the launch at risk.
- **Upload** — Files go straight to storage, stay in quarantine until they are checked, and are rejected if the type or size is wrong.
- **Processing** — Files are scanned, metadata is stripped, thumbnails are made, video is converted (including streaming for long video), and audio is converted. Large uploads can resume.
- **Delivery and removal** — Published media is served from a CDN. Removing content also clears it from the cache. Upload quotas apply by format.

## Feed, search, and engagement (P1)

People open the app and immediately find content, people, and products worth staying for.

- **Feeds** — A Home (For You) feed, a Following feed, and an Explore view. The Following feed can also be shown newest first.
- **Ranking** — The feed ranks by recency, follows, interactions, and popularity, and uses the existing AI recommendation models. If recommendations fail, a rule-based Popular or Trending view is shown, and the Following feed remains available.
- **Filters** — People filter by content type, category, creator type, country, and language. Age and policy rules apply to every feed and every search result.
- **Search** — Search covers users, creators, posts, hashtags, and shop products.
- **Engagement** — Likes or reactions, comments and replies, shares, saves, and hashtags, within the rules of the age zone.
- **Safety actions** — Report, block, and remove are available on content.
- **Loading** — Feeds load in pages or continuously, and feed and search results are cached so repeat visits stay fast.

## Direct messaging (P1)

All conversations on InrCliq go through one messaging service: social chat, shop orders, and bookings.

- **Inbox** — One-to-one messages, with history and an unread marker.
- **Message requests** — Someone who is not followed can send a request. The recipient accepts, declines, or blocks.
- **What can be sent** — Text, images, and links, plus a post, a product, or a creator profile. Attachment type and size are limited.
- **Status and alerts** — The sender can see delivery status. New messages raise a push or in-app notification. A conversation can be muted.
- **Orders** — A buyer and seller share a thread tied to that order. The thread records confirmed, paid, dispatched, delivered, cancelled, return requested, and refunded.
- **Bookings** — Instant Book confirmations, changes, and cancellations appear in a thread tied to the booking. Request-to-Book uses the thread to agree details, accept or decline, deliver the work, and confirm it is done.
- **Who is in the thread** — Participants come from the order or booking record, not from whatever the app sends. The history is kept with the transaction.
- **Child safety** — Adults and minors cannot message freely. Kids and Teens message only approved contacts, and the guardian is shown or told when policy requires it.
- **Moderation** — Messages and attachments are screened, including for grooming, scams, harassment, and attempts to take payment off the platform. Report, block, and mute are in every thread.

Group chat, voice calls, video calls, and disappearing messages are not in this launch.

## Special requests (P2)

A fan books a paid personalised service from a creator, either instantly or after the creator accepts.

- **Creator setup** — The creator turns Requests on or off, sets the category, description, price, and turnaround, and sets when they are available and how many requests they will take at once.
- **Booking type** — The creator chooses Instant Book or Request-to-Book. Basic clash checking stops double booking.
- **Fan journey** — The fan finds the creator, reads the offer, sends the details, confirms the price, and pays. For Request-to-Book the creator then accepts or declines. For Instant Book, payment confirms the booking immediately.
- **Conversation** — A protected thread opens in Direct Messaging for that booking.
- **Completion** — The creator finishes the request, the fan is notified, and the transaction closes with a record that can be audited.

## Payments (P2)

Shop orders and Special Requests share one way to take money, record it, and reconcile it.

- **Checkout** — The customer pays on a provider-hosted or tokenised checkout page. The app does not handle raw card data.
- **Request states** — A request moves through submitted, awaiting payment, awaiting acceptance, accepted, declined, cancelled or expired, in progress, completed, refunded or voided, and disputed or on hold.
- **Webhooks** — Payment notices are signed and cannot be replayed. A retry cannot create a second charge.
- **Ledger** — Every transaction is written to a ledger and reconciled daily, including the creator’s commission and the platform fee.
- **Refunds and pauses** — Staff can refund or void, and can pause payments or payouts.

## Creator shop (P2)

An approved creator lists products and a fan buys them on InrCliq. This uses the same payments and ledger as Special Requests.

- **Who can sell** — An approved adult creator, after identity and payout checks. A minor creator can sell only with guardian approval and only where the country’s rules allow it.
- **Listings** — The storefront sits on the creator profile. A product has a title, description, images, price, currency, stock, and delivery options, plus a category. Prohibited and age-restricted products follow the rules. Listings are moderated before they go live.
- **Buying** — The fan finds a product from a profile, a post, or the shop, sees the details, adds it to a cart or buys now, confirms delivery, pays, gets a confirmation, tracks the order, and can ask for a return or refund when the policy allows it.
- **Order states** — Pending payment, paid, processing, shipped, delivered, cancelled, return requested or refunded, and disputed or on hold.
- **Controls** — Price, stock, and totals are calculated on the server. Age-restricted products are hidden from under-18 users. A retry cannot create a second order or oversell stock. Delivery addresses are visible only to the buyer, that seller, and authorised staff.
- **Seller desk** — The seller has an order inbox, order history, and a basic sales summary. Staff can suspend a seller, remove a listing, or pause an order or a payout.
- **Policies** — Receipts or invoices, and the return, refund, and delivery rules for Sri Lanka and India, are published.

## Notifications

People hear about the things that need them, without a failed notice blocking the order or the booking.

- **Channels** — In-app notices, mobile push, and email or SMS/WhatsApp for critical account and guardian events.
- **Events** — New messages, guardian invites and decisions, booking confirmations, requests, shop orders, dispatch and delivery, payment, cancellation, completion, returns, refunds, safety events, and account restrictions.
- **Retries** — A failed notice is recorded and tried again. It does not stop the transaction it is about.

## Administration

Staff can find people, act on reports, and see money moving, with a record of who did what.

- **Accounts** — Find a user, see the guardian link, and suspend or reinstate the account under an approval control.
- **Safety queue** — Review reported content and reported conversations. Remove or restore content, and act on messaging accounts.
- **Commerce** — See requests, orders, payment status, and reconciliation. Review listings, seller status, returns, and disputes. Pause a transaction or a payout.
- **Access** — Review the audit history, revoke sessions, and assign reviewer roles. High-impact actions use a separate privileged account, strong sign-in, and their own audit record.

## Monitoring and support

Operators can see when sign-up, feed, media, payments, or messaging is failing.

- **Product health** — Sign-up and login failures, feed and search speed, empty searches, upload and conversion failures, moderation backlog, and guardian-approval failures.
- **Money** — Checkout, order, payment, and webhook failures.
- **Engagement** — Daily and monthly active users, posts, comments, shares, saves, searches, and how long people stay in the feed.
- **Messaging and recommendations** — Message delivery failures and delay, and whether recommendations are healthy or have fallen back to simple ranking.
- **Platform** — Application errors, database and storage health, CDN volume, and unusual or bot traffic.

## Not in the 90-day launch

These are planned for later (MVP+) or left out so they do not delay launch.

- Group messaging, broadcast channels, voice calls, and video calls.
- Creator subscriptions and members-only content.
- Advertising and a share of ad revenue for creators.
- A wider shop: multi-vendor marketplace, promotions, cross-border shipping, and deep inventory tools.
- The full RuleCore engine, new machine-learning training, and advanced personalisation beyond the models already built.
- Advanced Family Circle visuals, Threat Radar, and made-up trust scores.
- Live streaming, Kubernetes, and running in more than one region at once.
- Rebuilding the whole current prototype, or translating the whole interface into every language.
