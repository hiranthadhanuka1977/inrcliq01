# Family Circle, Age Zones, Parental Controls & Messaging — User Story Baseline

| Document | `us-family-circle-age-zones-parental-controls.md` |
| --- | --- |
| Audience | Business Analyst — starting point to expand the requirement |
| Module | Family Circle, age zones, parental controls, and messaging that those controls affect |
| Based on | The product as implemented in November 2026 |
| Actors | Young person (under 18), Guardian, Co-guardian, Adult sender, Platform |
| Primary surfaces | `/family-circle`, linked-account detail, `/guardian/approve`, direct messages |
| Related specs | `us-child-onboarding-and-approval.md`, `us-dm-safety-guardian-review.md`, `us-messaging.md`, `ba-family-center.md` |

---

## 1. How to use this document

This is a **baseline of what the product already covers**, written as user stories. It is not a full future specification.

Each story says what a person can do today and the acceptance criteria that match the current behaviour. Section 7 lists behaviour that is **shown in the interface but is not a working control yet**. Those items are the natural places to expand.

Age zone is a private safety classification. It is not a public badge on a profile.

---

## 2. Actors

| Actor | Who they are |
| --- | --- |
| **Young person** | An account under 18. Date of birth places them in Kids, Teens, or Mature Teens. |
| **Guardian** | An adult who approved a young person and is linked to that account. Only a linked guardian can open Family Circle. |
| **Co-guardian** | A second guardian linked to the same young person. They see the same safety alerts. The first decision on a held message stands. |
| **Adult sender** | An 18+ account sending a direct message. Can be restricted from messaging anyone under 18 after repeated safety flags. |
| **Platform** | Applies the age zone, runs the message safety check, holds or masks a message, and keeps the audit trail. |

---

## 3. Age zones (shared rules)

Date of birth is the source of truth. The stored zone is refreshed from that date.

| Zone | Ages | What it means for messaging |
| --- | --- | --- |
| **Kids Zone** | Under 13 | Strongest hold. A sexual message held for review is not shown to the child at all. |
| **Teens Zone** | 13, 14, or 15 | Same hold as Kids for a sexual message under review. |
| **Mature Teens Zone** | 16 or 17 | The young person sees a “hidden for safety” placeholder until a guardian decides. |
| **Adult profile** | 18 and over | Not a Family Circle child. Flagged messages follow adult delivery rules, not a guardian hold. |

If a minor account has no date of birth, messaging treats them as Kids Zone. Any other account with no date of birth is treated as an adult.

A young person is **monitored** when at least one guardian is linked to them, and that guardian is not the person sending the message.

---

## 4. Family Circle

Family Circle is the guardian’s home for linked young people. It is not available to a signed-out visitor or to an account that is not a guardian with access. Those people are sent away from the section.

Navigation:

| Section | What it is for |
| --- | --- |
| Overview | Summary, recent alert, Safe Contact Circle, recent request |
| Linked accounts | Every approved young person, then a detail page for one of them |
| Controls | A health summary of recommended defaults for each linked account |
| Safety alerts | Events that need a decision or an acknowledgement |
| Requests | Control-change items waiting for the guardian |
| Activity | A history of safety events and account events |

The alert count in the navigation refreshes while the guardian is using the section.

### US-FC-01 — Open Family Circle

**As a** guardian  
**I want to** open Family Circle for the young people I have approved  
**So that** I can look after their safety in one place.

**Acceptance criteria**

- A signed-in guardian with Family Circle access sees Overview, Linked accounts, Controls, Safety alerts, and Requests.
- A person who is not signed in cannot stay on Family Circle.
- An account that is not a guardian for this section is returned to their own profile area.
- The welcome line uses the guardian’s first name.

### US-FC-02 — See the family summary

**As a** guardian  
**I want to** see a short summary of my linked family  
**So that** I know where my attention is needed.

**Acceptance criteria**

- Overview shows how many accounts are linked, how many safety alerts are unresolved, how many requests are pending, and how many accounts are marked controls-healthy.
- Unresolved means an alert is waiting for a decision or an acknowledgement.
- If there is a recent safety alert, Overview shows it and a way to open the full alerts list.
- A short privacy note explains that the guardian sees safety events and outcomes, not private conversations, unless they choose to view a flagged message.

### US-FC-03 — Review a linked account

**As a** guardian  
**I want to** open one linked young person  
**So that** I can see who they are, their zone, their protection level, and who they message.

**Acceptance criteria**

- Linked accounts lists each approved young person with name, status, age zone, and protection level.
- Status reflects setup: still finishing setup, approved and finishing setup, or active.
- The detail page shows name, handle, age, date of birth, location when known, when they were linked, protection level, and a plain-language summary of what that level means for messaging.
- The detail page lists their direct-message contacts, excluding the private thread with the guardian.
- The guardian can open one contact to manage that conversation.
- Activity counts (posts, followers, following, subscriptions) are shown for context. This is not a full surveillance view of the child’s private content.

### US-FC-04 — Work through safety alerts

**As a** guardian  
**I want to** see safety alerts for my linked young people  
**So that** I can decide what happens to a held message or acknowledge an informational alert.

**Acceptance criteria**

- Alerts are listed for every young person linked to this guardian.
- Each alert has a safe category label (for example “Sexual content concern” or “Wellbeing safety concern”), a priority, a status, and a description of what the young person has or has not seen.
- The alert card does not contain the message text.
- Status labels include: awaiting decision, awaiting acknowledgement, acknowledged, allowed and delivered, rejected and not delivered, and expired and not delivered.
- A co-guardian sees the same alerts. The first completed decision is the one that stands.

### US-FC-05 — Read family activity

**As a** guardian  
**I want to** see a history of safety and account events  
**So that** I can understand what has already happened.

**Acceptance criteria**

- Real safety events appear in the activity history.
- Activity entries do not contain message text.
- The history also includes sample account and control entries used as a prototype. Those sample lines are not a complete audit of every setting change. See section 7.

---

## 5. Age zones

### US-AZ-01 — Place an account in a zone from date of birth

**As a** person signing up, or a guardian approving a young person  
**I want** the account’s zone to follow the date of birth  
**So that** safety rules stay aligned with the person’s age.

**Acceptance criteria**

- Under 13 is Kids Zone. 13–15 is Teens Zone. 16–17 is Mature Teens Zone. 18 and over is an Adult profile.
- Changing or correcting the date of birth updates the zone.
- A minor without a date of birth is treated as Kids Zone for messaging. Anyone else without a date of birth is treated as an adult.

### US-AZ-02 — Keep the zone private

**As a** young person  
**I want** my zone to stay private  
**So that** other people cannot see that I am in Kids, Teens, or Mature Teens.

**Acceptance criteria**

- The zone is shown to the linked guardian in Family Circle and to platform administrators.
- It is not presented as a public profile badge to other members.

### US-AZ-03 — Let the zone change what a young person sees in a held message

**As a** young person  
**I want** a message under safety review to be handled according to my zone  
**So that** younger accounts are shielded more strictly than older teens.

**Acceptance criteria**

- Kids and Teens do not see a held sexual message unless a guardian allows it.
- Mature Teens see only a masked “hidden for safety” placeholder until a guardian allows or rejects it.
- Adults are not placed in a guardian hold for this workflow.

### US-AZ-04 — Show the zone to the guardian in plain language

**As a** guardian  
**I want to** see which zone a linked young person is in, with a short explanation  
**So that** I understand the protection defaults for their age.

**Acceptance criteria**

- The guardian sees Kids Zone, Teens Zone, or Mature Teens Zone, with the age band and a one-line description.
- The description explains that Kids uses the highest defaults, Teens keeps strong defaults with guided activity, and Mature Teens allows more flexibility with tighter rules for adult contact.

---

## 6. Parental controls

Protection level is chosen when the guardian approves the young person. The three levels are Strict, Standard (recommended), and Relaxed. Platform administrators can change the stored level later. The guardian cannot edit the level from the Family Circle Controls page today.

What the product **tells** the guardian each level means:

| Level | What the guardian is told |
| --- | --- |
| **Strict** | Curated creators only. Direct messages off. Comments hidden. Safety alerts on. |
| **Standard** | Direct messages limited to approved contacts. Comment filtering on. Safety alerts on. |
| **Relaxed** | Direct messages allowed with standard moderation. Safety alerts on. |

The level is stored and shown. It does **not** yet turn those individual settings on and off by itself. Live messaging control is the per-contact restriction, the message safety check, and the guardian’s allow / reject / block decisions in section 7 of the stories below (messaging).

### US-PC-01 — Choose a protection level when approving a young person

**As a** guardian approving a young person  
**I want to** choose Strict, Standard, or Relaxed  
**So that** the account is linked with a protection level I understand.

**Acceptance criteria**

- The guardian must pick a level before approval completes.
- Standard is marked as recommended, with a note based on the young person’s age.
- The screen lists, in plain language, what that level is meant to include.
- The chosen level is saved on the link between guardian and young person and is visible later in Family Circle.

### US-PC-02 — See whether recommended controls look healthy

**As a** guardian  
**I want to** see a simple health summary for each linked account  
**So that** I know the recommended defaults the product is presenting.

**Acceptance criteria**

- Controls lists each linked account with discoverability, direct messaging, safety alerts, and location sharing.
- Discoverability is shown as Private.
- Direct messaging is shown as Off when the stored level is Strict, and Restricted otherwise.
- Safety alerts are shown as On.
- Location sharing is shown as Off, and marked for attention when the stored level is Relaxed.
- Each row has a short explanation of what that control is for.
- These rows are a status display. They are not switches the guardian can change on this page. See section 7.

### US-PC-03 — Place contacts in a trust band

**As a** guardian  
**I want to** place a contact in a trust band on the Safe Contact Circle  
**So that** I can record how close that relationship is.

**Acceptance criteria**

- Bands are Immediate family, Relatives, School friends, and Approved friends & adults.
- The guardian can set the band for a direct-message contact or for a sibling who is also linked to them.
- The choice is saved and shown again the next time they open Family Circle.
- A contact with no saved band is given a default band for display.
- The band is a guardian label. It does not, by itself, allow or block messages. See section 7.

### US-PC-04 — Restrict, hold, or block one contact

**As a** guardian  
**I want to** control messaging with one specific contact of a linked young person  
**So that** I can stop a conversation without changing the whole account.

**Acceptance criteria**

- From the contact, the guardian can mark the conversation restricted, requiring approval, or blocked.
- When messaging is restricted or blocked, the young person and the contact cannot continue that conversation. The sender sees that direct messaging with this contact is restricted by a guardian.
- Blocking can also be done from a safety alert, naming the other person.
- The change is limited to that guardian’s linked young person and that contact. Another family’s accounts are unaffected.
- The guardian cannot apply this control to a contact thread that does not belong to the linked young person.

---

## 7. Messaging related to parental controls

Every direct message is checked before it is delivered. The checks run in this order. The first match is the one that applies.

1. If a guardian has restricted or blocked this contact, the message is not sent.
2. If the sender is currently barred from messaging anyone under 18, and the recipient is under 18, the message is not sent.
3. If the safety check cannot be completed and the recipient is under 18, the message is not sent. The sender is asked to try again. There is no “send anyway”.
4. If the message is not flagged, it is delivered normally.
5. If the message is flagged and the recipient is an adult, the sender is warned and may send anyway. The recipient gets a masked version. No guardian hold.
6. If the message is flagged, the recipient is under 18, and the concern is not sexual, the sender is warned and may send anyway. The recipient gets a masked version. Linked guardians get a medium-priority informational alert.
7. If the message is sexual, the recipient is under 18, and the recipient is **not** monitored, the sender is warned and cannot send anyway. An adult sending at the highest severity is reported automatically.
8. If the message is sexual, the recipient is under 18, and the recipient **is** monitored, the sender may send anyway, but the message is held for a guardian. Kids and Teens see nothing. Mature Teens see a masked placeholder.

The sender is never told the safety category, the severity, or that a guardian is reviewing the message.

### US-DM-01 — Send an ordinary message

**As a** member messaging someone  
**I want** an ordinary message to arrive normally  
**So that** safety checks do not interfere when there is nothing to review.

**Acceptance criteria**

- A message that is not flagged, and is not blocked by a guardian or a minors restriction, is delivered.
- No safety alert is created.

### US-DM-02 — Be stopped when a guardian has closed the contact

**As a** member  
**I want** a clear stop when a guardian has restricted that contact  
**So that** I do not keep trying to message a young person against the guardian’s decision.

**Acceptance criteria**

- Restricted or blocked contacts cannot receive a new message in that thread.
- The composer is disabled.
- The explanation is that direct messaging with this contact is restricted by a guardian.
- The explanation does not describe the young person’s zone or the contents of earlier alerts.

### US-DM-03 — Be stopped from messaging any young person after repeated flags

**As an** adult sender who has been restricted  
**I want** to be told that I cannot message accounts under 18  
**So that** I understand the limit and, when it is temporary, when it ends.

**Acceptance criteria**

- The restriction applies to every recipient under 18, not only the original child.
- A 7-day restriction tells the sender the date it ends.
- A restriction that is waiting for a platform review tells the sender that messaging under-18 accounts is paused while the account is reviewed.
- The sender can still message adults, unless some other rule stops that message.
- The restriction is not applied to a minor sender. Minor senders are not given strikes.

### US-DM-04 — See a warning that does not reveal the review

**As a** sender writing to a young person  
**I want** a policy warning when a message is blocked by the safety check  
**So that** I can edit it or, where allowed, send it anyway, without learning how the review works.

**Acceptance criteria**

- The warning title is “Message blocked”.
- The text says the message was blocked under the policy for interacting with a minor, and that the sender can edit it or send it anyway when that option exists.
- The warning does not name the category, the severity, the zone, or a guardian.
- If the safety check itself fails, the title is “Message not sent” and the sender is asked to try again, with no send-anyway option.

### US-DM-05 — Hold a sexual message for a monitored child

**As a** guardian of a monitored young person  
**I want** a sexual message to wait for my decision  
**So that** the young person does not receive it until I allow it.

**Acceptance criteria**

- The sender can choose send anyway. The message is then held, not delivered as written.
- Kids and Teens see nothing while it is held.
- Mature Teens see a masked placeholder until the guardian decides.
- The guardian gets an alert. Priority is high when the sender is an adult, the severity is high, or the sender is an older teen or adult writing to a much younger child. Otherwise the priority is medium.
- An adult sender who is not the child’s own guardian receives a strike for sending anyway.
- A guardian messaging their own child does not receive a strike for this.
- If the sender is also a monitored minor, that sender’s guardians are informed. The sender is not given a strike.
- An adult sending to a Kids or Teens account at the highest severity is also reported for platform review.

### US-DM-06 — Allow, reject, or let a held message expire

**As a** guardian  
**I want to** allow or reject a held message, or have it expire if I do not decide  
**So that** I control whether the young person ever receives it.

**Acceptance criteria**

- Allow delivers the message to the young person. The alert status becomes “Allowed — delivered”. If the sender had a strike for that message, the strike is voided.
- Reject does not deliver it. Kids and Teens never see it. Mature Teens only see a removed-message notice. The status becomes “Rejected — not delivered”.
- If nobody decides within 7 days, the message is not delivered and the status becomes “Expired — not delivered”.
- The alert explains the outcome in plain language, including the young person’s first name, without quoting the message.
- Co-guardians share the alert. The first completed decision wins.

### US-DM-07 — View a held message without exposing it widely

**As a** guardian  
**I want to** open a held message only when I choose to  
**So that** I can make a decision without the content sitting in the alert list.

**Acceptance criteria**

- Alert cards and activity lines never include the message text.
- “View message” shows a light-masked version: explicit words reduced, and emails, phone numbers, links, and @handles hidden.
- Each view is recorded in the audit trail.
- The young person never receives the raw text unless the guardian allows the message.
- The held text is removed 30 days after an allow, or 90 days after a reject or expiry, unless an open report still needs it.

### US-DM-08 — Acknowledge an informational messaging alert

**As a** guardian  
**I want to** acknowledge an alert that does not need an allow or reject  
**So that** I can clear events where a message was masked or a linked young person sent something that was flagged.

**Acceptance criteria**

- A non-sexual flagged message to a young person can be sent anyway and is delivered masked. Guardians get a medium-priority alert to acknowledge, not a hold.
- If a monitored minor sends a flagged message, their guardians are told that it was held for a safety review instead of being delivered as written. The minor sender is not given a strike.
- Acknowledging updates the alert so it is no longer unresolved.

### US-DM-09 — Block the other person from the alert

**As a** guardian reviewing an alert  
**I want to** block the other person in that conversation  
**So that** they cannot keep messaging my linked young person.

**Acceptance criteria**

- The guardian can block the named counterpart from the alert.
- After the block, that contact is restricted by the guardian control in US-PC-04.
- The alert records that the contact was blocked, without quoting the message.

---

## 8. Shown in the product, not a working control yet

Use this list when expanding the requirement. These items appear in Family Circle or in the approval copy, but they are not enforced as independent settings today.

| What the guardian sees | What is actually true |
| --- | --- |
| “You can change this anytime from your dashboard” on the protection step | The level is stored at approval. A guardian cannot change it inside Family Circle. An administrator can change it. |
| Controls page rows for discoverability, comments, curated creators, and location | These are status labels derived from the stored protection level. There is no switch, and they do not currently change search, comments, the creator list, or location sharing. |
| Requests such as “asked to allow DMs from approved contacts” | The requests list is sample content, not a request the young person submitted. |
| Most of the activity history (protection reviewed, location request declined, screen time, and similar) | Sample history, mixed in with real safety events. Real safety events are the ones to treat as in scope. |
| Safe Contact Circle trust bands | Saved labels for the guardian’s own organisation of contacts. Choosing a band does not allow or block messaging. |

Also out of this baseline, and useful for a later expansion:

- A young person’s appeal after a guardian rejects a message.
- Guardian alerts by email, SMS, or another channel. Alerts are in Family Circle only.
- A human moderator console for reports. A severe case can be queued; there is no reviewer screen in this story set.
- Images, video, and live content inside direct messages.
- Applying the protection level automatically to the feed, comments, and who can discover the account.

---

## 9. Suggested expansion order

1. Decide which protection-level promises (discoverability, comments, curated creators, location, “DMs off”) should become real settings, and whether the guardian can change them after approval.
2. Replace the sample requests with a real ask from the young person, and a guardian approve or decline.
3. Decide whether trust bands should affect who can message, or stay as a private organising label.
4. Keep the messaging hold, mask, strike, and privacy rules as they are unless a story explicitly changes them. They are the working parental-control behaviour for messages.
