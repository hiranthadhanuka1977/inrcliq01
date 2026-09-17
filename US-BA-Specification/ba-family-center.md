# Family Circle & Child Safety — Prototype Scope & Implementation Map

| Document | `ba-family-center.md` |
| --- | --- |
| Module | Family Circle, Guardian controls, Young-person safety UX |
| Based on | *InrCliq Kids, Teens & Mature Teens Zones — Parental Control UX/UI Specification* v3.2 (28 Aug 2026) |
| Compared to | Current prototype in `src/` and `prisma/` (as of 2026-08-31) |
| Actors | Young person (minor), Primary guardian, Additional guardian (future), Platform |
| Primary surfaces | `/family-circle`, `/family-circle/[childId]`, guardian approval flow, minor account profile, onboarding |
| Related specs | `uc-onboarding.md`, `us-main-feed.md` |
| Source PDF | `InrCliq_Kids_Teens_Mature_Teens_Parental_Control_UX_UI_Specification.pdf` |

---

## 1. Purpose

This document translates the **Child Safety & Parental Control UX/UI Specification** into a **prototype implementation map** for InrCliq. It answers:

1. What the spec requires at a product level.
2. What the current prototype already supports.
3. What can be built next without Rulecore, Tier-2 moderation, or multichannel comms infrastructure.
4. What remains out of scope for this prototype phase.

**Design principle (from source spec):** Protect by default, explain without exposing harmful detail, involve guardians proportionately, and preserve a young person’s dignity and route to appeal.

**Important:** “Zone” (Kids / Teens / Mature Teens) is a **private UX policy profile** — never shown publicly on profiles, URLs, or badges visible to other users.

---

## 2. Source specification summary

### 2.1 Product outcomes (spec §1.1)

| Outcome | Prototype relevance |
| --- | --- |
| Age-appropriate defaults with gradual autonomy | Partial — minor vs adult only; no 8–12 / 13–15 / 16–17 zones yet |
| Verified guardian consent before activation | **Implemented** (guardian approval flow) |
| Proportionate parental visibility (safety events, not surveillance) | **Not implemented** — no Safety Alerts / Activity yet |
| Clear explanations for blocked/limited/pending content | Partial — image upload block only |
| Guardian escalation for qualifying U16 safety events | **Not implemented** (copy only) |
| Consistent treatment across posts, comments, DMs, images, video | Partial — image moderation on composer only |
| Auditable trail for consent, controls, alerts, appeals | Partial — guardian link + approval; no alert/appeal receipts |

### 2.2 In scope vs out of scope (spec §1.2)

| In scope (spec) | Prototype can cover |
| --- | --- |
| Child/teen/mature-teen zones; guardian onboarding; family dashboard; permissions; alerts; appeals; age transitions | Zones (private), onboarding, Family Circle shell, mocked alerts/appeals, transition preview |
| Mobile-first + parent web fallback | Web prototype (current stack) |

| Out of scope (spec) | Do not build in prototype |
| --- | --- |
| Moderator console UI | Yes — defer |
| Model training; infrastructure deployment | Yes — defer |
| Legal opinion; law-enforcement procedures | Yes — defer |
| Payment/subscription parental controls | Yes — defer |
| Rulecore / market-specific legal ages | Yes — defer (use configurable constants) |
| WhatsApp / WeChat / SMS alert channels | Yes — defer (in-app + email mock only) |

### 2.3 Age-zone operating model (spec §3)

Proposed bands (configurable by market):

| Zone | Default age band | Supervision model |
| --- | --- | --- |
| **Kids Zone** | 8–12 | Guardian-managed; strongest defaults |
| **Teens Zone** | 13–15 | Guardian-supervised; high-signal safety notifications |
| **Mature Teens Zone** | 16–17 | Teen-led with safety defaults; guardian optional per market |
| **Adult** | 18+ | Self-managed |

**Current prototype:** `AccountType.MINOR` vs `ADULT` only. Protection tiers (strict / standard / relaxed) exist as **labels and guardian selection**, not as full zone profiles.

### 2.4 Default controls matrix (spec §3.1) — enforcement status

| Control | Spec intent | Prototype today |
| --- | --- | --- |
| Account discoverability | Private by default for youth | Not enforced |
| Inbound contact | Tiered by zone | Not enforced |
| Direct messaging | Guardian-approved / restricted / safety defaults | Guardian–child DM threads exist; no tier-based DM policy |
| Content visibility | Age-appropriate feed | Not enforced |
| Location sharing | Off / guardian-locked | No location feature |
| Downloads / remix / duet | Off by default | Not in product |
| Screen-time schedule | Guardian-managed → self-managed | Not in product |
| Safety-event alerts | Guardian receives qualifying events | Copy only (“you’ll be notified”) |
| Control-change notice | Guardian approval / teen request | Not implemented |

---

## 3. Current prototype — what exists today

### 3.1 Data model

| Entity | Status | Location |
| --- | --- | --- |
| `User` with `accountType` (MINOR / ADULT / GUARDIAN) | Implemented | `prisma/schema.prisma` |
| `ParentApprovalRequest` | Implemented | Guardian invite + approval |
| `GuardianChildLink` | Implemented | Durable link on approval completion |
| `UserProfile` + public slug/handle | Implemented | Profile pages, follow |
| `CreatorUser` bridge | Implemented | Auto-created on follow/post |
| `ChatThread` (guardian ↔ child) | Implemented | `chat-service.ts` |
| Safety alerts, appeals, control settings | **Not in schema** | — |

### 3.2 Guardian journey (spec Journey A, screens PC-01–PC-07)

| Screen / step | Spec ID | Prototype status |
| --- | --- | --- |
| Age & region gate | PC-01 | **Done** — signup DOB + country |
| Guardian invitation | PC-02 | **Done** — parent email on minor onboarding |
| Pending activation | PC-03 | **Done** — waiting view, resend, expiry display |
| Guardian verification | PC-04 | **Prototype** — simulated ID + face scan in guardian flow |
| Consent summary | PC-05 | **Done** — `ParentConsentStep` |
| Young person transparency | PC-06 | **Gap** — no “what guardian can/cannot see” screen |
| Guardian overview | PC-07 | **Partial** — Family Circle child list + detail |
| Zone & protection summary | PC-08 | **Partial** — tier on profile + child detail |
| Controls catalogue | PC-09–PC-10 | **Gap** — no settings UI |
| Change request | PC-11 | **Gap** |
| Safety alerts | PC-12–PC-13 | **Gap** |
| Creator decision / appeal | PC-14–PC-16 | **Partial** — image block on upload only |
| Guardian access (multi-guardian) | PC-17 | **Gap** |
| Age transition | PC-18 | **Gap** |
| Privacy explainer | PC-19 | **Gap** |
| Safety service unavailable | PC-20 | **Partial** — moderation pending/error on upload |

### 3.3 Family Circle (guardian)

| Feature | Status |
| --- | --- |
| `/family-circle` — list linked children | **Done** |
| Child card — name, handle, age, protection tier, status, message | **Done** |
| `/family-circle/[childId]` — detail + activity stats | **Done** (posts, followers, following, subscriptions — not DMs) |
| Family Circle nav entry for guardians | **Done** |
| Safety Alerts tab | **Not built** |
| Controls tab | **Not built** |
| Requests tab (approve/decline setting changes) | **Not built** |
| Guardian Access / Privacy & Data | **Not built** |

### 3.4 Young person surfaces

| Feature | Status |
| --- | --- |
| Guardian row on own profile (name, handle, message) | **Done** |
| Protection tier icon + privacy label | **Done** |
| Public profile + follow | **Done** |
| **My Safety** hub | **Not built** |
| **My Controls** | **Not built** |
| **Safety Activity** (decisions, appeals) | **Not built** |
| **Family Link** (linked guardians, visibility boundaries) | **Not built** |
| **Help & Report** | **Not built** |

### 3.5 Moderation UX (spec §6.2, §8)

| System outcome | Young person UX | Guardian UX (U16) | Prototype |
| --- | --- | --- | --- |
| Allow / Low | No interruption | No alert | Default publish |
| Block / High | Interruption + category + next steps | Safe alert | Image upload block only; no guardian alert |
| Quarantine / pending | “Safety check pending” | Alert if policy triggers | Upload “checking photo” state |
| Appeal | Request review + timeline | Updated alert | **Not built** |

**Existing:** `POST /api/feed/moderate-image`, client safety check in first-post composer, block on NSFW.

### 3.6 Spec component library (§7.1) — build status

| Component | Purpose | Status |
| --- | --- | --- |
| `ZoneBadge` | Private zone indicator (account holders only) | Not built |
| `ManagedSettingRow` | Setting value, owner, locked, recommended | Not built |
| `SafetyStatusChip` | Allowed, Limited, Pending, Removed, etc. | Not built |
| `SafePreview` | Blurred preview + category | Not built |
| `AlertPriorityBanner` | High / Review recommended / Information | Not built |
| `GuardianReceipt` | Consent/control/ack reference ID | Not built |
| `HelpCard` | Guidance + report/block | Not built |
| `TransparencyDrawer` | Short explanation + learn more | Not built |
| `ProtectionTierIcon` | Tier icon before protection label | **Done** |

---

## 4. Recommended prototype implementation phases

### Phase A — Close the guardian journey gap (highest ROI)

| # | Feature | Spec reference | Effort | Notes |
| --- | --- | --- | --- | --- |
| A1 | Young person transparency screen after approval | PC-06, AC-03 | S | After `/onboarding/approved`; bullet what guardian can/cannot see |
| A2 | Family Circle section tabs | §5.2 | M | Overview (current), Controls (read-only), Alerts (mock), Requests (mock) |
| A3 | Consent / activation receipts | AC-12, §9 | S | Reference ID + timestamp after guardian approval |
| A4 | Pending activation polish | PC-03 | S | Masked guardian email, expired state, change contact |

### Phase B — Young person safety surfaces

| # | Feature | Spec reference | Effort | Notes |
| --- | --- | --- | --- | --- |
| B1 | **My Safety** hub for minors | §5.1 | M | Protection summary, linked guardian, help entry |
| B2 | **Safety Activity** feed | §5.1, §8 | M | Log image moderation outcomes with decision IDs |
| B3 | Creator decision screen on blocked upload | PC-14, AC-07 | M | What happened, category, effect, mock appeal CTA |
| B4 | Mock appeal flow | PC-15–16, AC-09 | M | `SafetyAppeal` table; submitted → in review → outcome |
| B5 | **Family Link** view for minor | §5.1 | S | Linked guardian(s), visibility boundaries |

### Phase C — Make protection tiers real

| # | Feature | Spec reference | Effort | Notes |
| --- | --- | --- | --- | --- |
| C1 | Enforce strict tier | §3.1 | M | Hide comments, restrict DMs, curated feed placeholder |
| C2 | Enforce standard tier | §3.1 | M | DM requests; comment filter messaging |
| C3 | Enforce relaxed tier | §3.1 | S | DMs with moderation defaults |
| C4 | Private age zone derivation | §3, AC-01 | S | Kids 8–12 / Teens 13–15 / Mature 16–17 from DOB; never public |

### Phase D — Guardian alerts (mocked end-to-end)

| # | Feature | Spec reference | Effort | Notes |
| --- | --- | --- | --- | --- |
| D1 | Safety Alerts list + detail | PC-12–13, AC-05 | M | Mock data; blurred safe preview |
| D2 | Alert actions | §6.3, §9.1 | S | Acknowledge, Talk, View guidance, Support appeal |
| D3 | In-app notification + deep link | §9.2 | M | `/family-circle/alerts/[id]` |
| D4 | Email notice (minimal copy) | §9.2, AC-06 | M | No raw content on lock screen / email body |

### Phase E — Extended prototype (lower priority)

| # | Feature | Spec reference | Notes |
| --- | --- | --- | --- |
| E1 | Control change request workflow | PC-11 | Teen requests; guardian approves/declines |
| E2 | Additional guardian (read-only) | PC-17 | Secondary guardian with limited permissions |
| E3 | Age transition preview | PC-18, AC-10 | Approaching 13 / 16 / 18 |
| E4 | Help & Report entry points | §5.1 | Category picker; log to DB |
| E5 | “Cannot safely use this guardian” route | §12.3 | Discreet entry; no auto-notify challenged guardian |
| E6 | Reusable spec components | §7.1 | Design system pass |

---

## 5. User stories (prototype backlog)

### Guardian — Family Circle

| ID | Story | Acceptance criteria (prototype) |
| --- | --- | --- |
| FC-G01 | As a guardian, I see all linked children in Family Circle | List shows name, handle, age, protection tier, status, message action |
| FC-G02 | As a guardian, I open a child detail page | Shows profile link, activity stats, protection description, message |
| FC-G03 | As a guardian, I view unresolved safety alerts | Alerts list with priority, category, date; no harmful thumbnail in list |
| FC-G04 | As a guardian, I open an alert and take action | Safe preview blurred; Acknowledge / Talk / Guidance; records action |
| FC-G05 | As a guardian, I review control settings for a child | Read-only catalogue with managed/locked tags per protection tier |
| FC-G06 | As a guardian, I approve or decline a setting change request | Request shows setting, optional teen reason; outcome visible to both parties |
| FC-G07 | As a guardian, I receive an activation receipt after approving a child | Receipt shows date, reference ID, protection tier chosen |

### Young person — Safety & family

| ID | Story | Acceptance criteria (prototype) |
| --- | --- | --- |
| FC-Y01 | As a minor, I see what my guardian can and cannot see before finishing onboarding | Transparency screen after parent approval; plain language |
| FC-Y02 | As a minor, I view My Safety | Current protection level, linked guardian, link to help |
| FC-Y03 | As a minor, I see moderation decisions about my content | Safety Activity lists decisions with status chips; no raw scores |
| FC-Y04 | As a minor, I request review of a blocked upload | Appeal form without re-uploading harmful media; timeline visible |
| FC-Y05 | As a minor, I view linked guardians in Family Link | Guardian display name; masked contact; what they can see |
| FC-Y06 | As a minor, I message my guardian | Existing DM thread from profile / Family Link |

### Platform — Policy & privacy

| ID | Story | Acceptance criteria (prototype) |
| --- | --- | --- |
| FC-P01 | Zone is never public | No zone badge on public profile, URL, or metadata inferable by others |
| FC-P02 | Fail-safe on moderation unavailable | Upload stays unpublished; pending state; retry messaging (PC-20, AC-08) |
| FC-P03 | Guardian notifications contain no raw harmful content | Lock screen / email use category + action only (AC-06) |
| FC-P04 | Consumer UI does not leak model thresholds | No confidence scores or evasion hints (AC-14) |

---

## 6. Information architecture (target)

### 6.1 Young person navigation (spec §5.1)

| Destination | Prototype priority | Route (proposed) |
| --- | --- | --- |
| My Safety | **P1** | `/feed/me/safety` or tab on `/feed/me` |
| My Controls | P2 | `/feed/me/controls` |
| Safety Activity | **P1** | `/feed/me/safety/activity` |
| Requests | P2 | `/feed/me/safety/requests` |
| Family Link | **P1** | `/feed/me/family` |
| Help & Report | P2 | `/feed/help` or modal |

### 6.2 Guardian Family Centre navigation (spec §5.2)

| Destination | Prototype priority | Route (proposed) |
| --- | --- | --- |
| Overview | **Done** | `/family-circle` |
| Child detail | **Done** | `/family-circle/[childId]` |
| Controls | **P1** | `/family-circle/[childId]/controls` |
| Safety Alerts | **P1** | `/family-circle/alerts` |
| Safety Activity | P2 | `/family-circle/[childId]/activity` |
| Requests | P2 | `/family-circle/requests` |
| Guardian Access | P3 | `/family-circle/access` |
| Privacy & Data | P3 | `/family-circle/privacy` |

---

## 7. Moderation-to-UX mapping (implementation guide)

Use this when wiring real or mocked moderation outcomes (spec §8).

| System outcome | Young person UI | Guardian UI (U16) | Content state | Appeal |
| --- | --- | --- | --- | --- |
| Allow / Low | No interruption | No alert | Published | N/A |
| Downrank / Hide | Explain reduced visibility | Normally no alert | Hidden to others | If impactful |
| Limit / Medium | “Limited” + scope | Alert if high-signal trigger | Restricted | Available |
| Quarantine | “Safety check pending” | Alert if policy says so | Not distributed | After decision |
| Block / High | Full decision page + support | Safe alert (qualifying triggers) | Removed | If eligible |
| Restore | Notify creator | Update alert timeline | Restored | Closed |

**Safety writing rule:** Describe category and platform action. Do not reproduce harmful media, PII, raw scores, or thresholds.

---

## 8. API / data objects (minimum for UX — spec Appendix C)

Prototype should plan fields for future APIs even if mocked initially:

| Object | Minimum fields |
| --- | --- |
| Zone profile | `zone_code`, `age_policy_version`, `supervision_required`, `transition_effective_at` |
| Family link | `link_id`, `guardian_display_name`, `masked_channel`, `role`, `permissions`, `verification_state`, `consent_state` |
| Control | `control_id`, `value`, `default_value`, `owner`, `locked`, `recommended`, `change_mode`, `last_changed_at` |
| Decision | `decision_id`, `content_type`, `consumer_category`, `action`, `status`, `effect_summary`, `appeal_eligible`, `guardian_notified` |
| Safe preview | `preview_type`, `redaction_state`, `reveal_allowed`, `alt_text` |
| Alert | `alert_id`, `priority`, `linked_account_display`, `category`, `action_taken`, `status`, `decision_id` |
| Appeal | `appeal_id`, `decision_id`, `status`, `submitted_at`, `outcome`, `consumer_rationale` |

### Suggested Prisma additions (future)

```
SafetyDecision    — moderation outcomes per user/content
GuardianAlert     — guardian-facing alerts linked to decisions
SafetyAppeal      — appeal requests and outcomes
ChildControl      — per-child setting values (or JSON on GuardianChildLink)
ControlChangeRequest — teen-initiated change requests
```

---

## 9. Out of scope for prototype (explicit)

Do **not** implement in the current prototype phase:

- Moderator console and human review queue UI
- Tier-2 escalation pipeline (Azure Content Safety, evidence bundles)
- Rulecore / per-market legal age configuration
- WhatsApp, WeChat, SMS transactional templates
- Video and audio moderation pipelines
- Screen-time scheduling
- Location sharing controls
- Downloads / remix / duet controls
- Payment or subscription parental controls
- Production analytics taxonomy (§14) beyond basic event stubs
- Full WCAG 2.2 AA certification (target accessibility patterns only)

---

## 10. Acceptance criteria traceability (spec §15.2)

| ID | Area | Prototype target |
| --- | --- | --- |
| AC-01 | Age zone | Private zone from DOB; not public (Phase C4) |
| AC-02 | Consent | Supervised account cannot complete without guardian approval (**met**) |
| AC-03 | Transparency | Pre-activation “what guardian can see” (Phase A1) |
| AC-04 | Controls | Every setting shows value, owner, consequence (Phase A2/C) |
| AC-05 | Alerts | Qualifying triggers → guardian alert with safe preview (Phase D) |
| AC-06 | Privacy | No raw content in notifications (Phase D4) |
| AC-07 | Decision | Blocked content shows action, category, appeal (Phase B3) |
| AC-08 | Fail-safe | Tier-2 unavailable → quarantine, not publish (**partial** on image mod) |
| AC-09 | Appeal | Visible timeline; outcome updates content (Phase B4) |
| AC-10 | Age transition | Preview deltas; no silent weaken (Phase E3) |
| AC-11 | Accessibility | Status not colour-only; 44px targets on new components |
| AC-12 | Audit | Receipts for consent, controls, acknowledgements (Phase A3) |
| AC-13 | Security | Step-up for sensitive guardian actions (defer) |
| AC-14 | No threshold leakage | No model scores in UI (**met** for current mod) |
| AC-15 | Localisation | Strings in constants / i18n-ready (ongoing) |

---

## 11. Key files (current implementation)

| Area | Path |
| --- | --- |
| Schema | `prisma/schema.prisma` (`GuardianChildLink`, `ParentApprovalRequest`) |
| Guardian approval flow | `src/components/guardian/GuardianFlow.tsx`, `src/lib/auth/guardian-flow.ts` |
| Guardian link on approval | `src/lib/guardian/guardian-child-link.ts` |
| Family Circle | `src/lib/guardian/family-center.ts`, `src/components/feed/family/FamilyCenterView.tsx` |
| Child detail | `src/lib/guardian/child-detail.ts`, `src/components/feed/family/ChildDetailView.tsx` |
| Protection tiers | `src/lib/guardian/constants.ts`, `src/components/guardian/ProtectionTierIcon.tsx` |
| Minor profile guardian row | `src/components/feed/account/AccountProfileView.tsx` |
| Guardian ↔ child chat | `src/lib/feed/chat-service.ts` |
| Minor onboarding | `src/lib/auth/onboarding.ts`, `src/components/onboarding/ParentWaitingView.tsx` |
| Image moderation | `src/lib/moderation/`, `src/app/api/feed/moderate-image/route.ts` |
| Onboarding BA spec | `US-BA-Specification/uc-onboarding.md` |

---

## 12. Open decisions (spec §15.3)

Resolve before production; prototype may use defaults:

| Decision | Owner | Prototype default |
| --- | --- | --- |
| Market-by-market age bands | Legal / Product | 8–12 / 13–15 / 16–17 / 18+ |
| Minimum supported age | Executive / Legal | Block signup under 8 (config flag) |
| Guardian identity assurance level | Security / Legal | Simulated ID verify (current) |
| Mature teen guardian notifications | Policy / Legal | User-only unless configured |
| When not to disclose alert to child | Safeguarding / Legal | Always disclose except T&S override flag |
| Crisis/support resources by market | Trust & Safety | Static help links in prototype |
| Additional guardian permissions | Product / Legal | Primary guardian only in v1 prototype |

---

## 13. Summary

| Category | Count | Notes |
| --- | --- | --- |
| **Already in prototype** | ~15 major capabilities | Guardian onboarding, link, Family Circle shell, tiers (UI), profiles, follow, guardian DM, image mod |
| **Recommended next (Phases A–D)** | ~20 features | Transparency, safety hubs, mocked alerts/appeals, tier enforcement |
| **Defer to production** | ~10 areas | Full moderation pipeline, multichannel alerts, Rulecore, moderator console |

**Highest-value next slice:** Phase A (transparency + Family Circle tabs + receipts) + Phase B3 (blocked upload decision screen) — maximum spec coverage with minimal new infrastructure.

---

*Governance: This document is a BA / product-design artefact aligned to the UX/UI specification v3.2. It is not legal advice. Country-specific child privacy, consent, and safeguarding obligations require legal validation before production launch.*
