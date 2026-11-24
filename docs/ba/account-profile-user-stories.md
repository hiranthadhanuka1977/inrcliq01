# Account profile — user stories

**Product:** InrCliq  
**Area:** Account profile (`/feed/me` and the screens opened from it)  
**Status:** As built  
**Audience:** Product, design, and engineering  
**Date:** 22 November 2026

This document describes the signed-in account profile: what a member can see and do today. Stories that are listed in the interface but have no behavior are called out as not yet delivered, so they are not treated as working features.

## 1. Purpose

The account profile is the member’s private home for identity and relationships. It is distinct from the public profile other people visit.

From here a member can:

- See who they are on InrCliq (name, handle, account type, privacy, verification).
- Finish setup: password, handle, photo, first post, and, for adults and guardians, age confirmation.
- Review and edit the details used on the profile.
- See followers, people they follow, and active subscriptions, and act on the first two.
- Change their password from Settings.

## 2. Actors

| Actor | Who they are | What changes for them |
| --- | --- | --- |
| Adult | Account type Adult | Sees a Not-verified chip until age is confirmed. Age confirmation is part of profile completion. |
| Guardian | Account type Guardian | Family Circle shortcut on the name. Age confirmation is part of profile completion. No child-guardian row. |
| Minor | Account type Minor | Guardian name and a message link when a guardian is linked. Privacy shows the guardian’s protection level, or “Not set”. Age confirmation is not offered. `/feed/me/adult` sends them back to the profile. |
| Signed-out visitor | No session | Every screen in this area sends them to `/`. |

A **verified creator badge** (star and Verified chip) means the profile or linked creator record is verified. It is not email verification and it is not adult identity confirmation.

## 3. Map

| Screen | Path | Story |
| --- | --- | --- |
| Your profile | `/feed/me` | AP-01 to AP-12 |
| Profile information | `/feed/me/edit` | AP-13 to AP-15 |
| Change name | `/feed/me/edit/name` | AP-16 |
| Change or set handle | `/feed/me/edit/handle` | AP-17 |
| Change email | `/feed/me/edit/email` | AP-18 |
| Profile completion | `/feed/me/completion` | AP-19 to AP-20 |
| Set a password | `/feed/me/password` | AP-21 |
| Confirm you are an adult | `/feed/me/adult` | AP-22 |
| Settings | `/feed/me/settings` | AP-23 to AP-25 |

Deep link: `/feed/me?tab=followers`, `following`, or `subscriptions`. Any other value opens Subscriptions.

## 4. Business rules that apply across stories

1. Only a signed-in member can open these screens.
2. The display name prefers the profile display name, then the linked creator name, then first and last name.
3. A handle is stored without the `@`. The interface shows `@handle`. With no handle, the profile says “No handle set”.
4. A password counts as set only when the member chose one. A system placeholder hash does not count.
5. Adult identity counts as complete when status is `submitted` or `accepted`. `rejected` blocks a new attempt and shows an error.
6. Minors are excluded from the adult-identity completion item. Adults and guardians include it. Completion percent is completed items divided by the items that apply, rounded.
7. Prompts on the profile are remembered per member in this browser. Dismissing one does not dismiss the others.
8. Only one setup prompt appears at a time, in this order: no handle → set handle; handle and no posts → first post; handle and at least one post → share. The adult prompt can appear above that prompt for an unverified adult.
9. The public-profile shortcut appears only when a public profile link exists and a handle is set.
10. Settings rows other than Password are visible and do nothing.

---

## 5. Your profile

### AP-01 — Open my account profile

**As a** signed-in member, **I want** a private profile page, **so that** I can see my account without leaving the feed shell.

**Acceptance criteria**

- Opening `/feed/me` shows the left navigation, the profile card, and mobile navigation.
- The page title is “Your profile · INRCLIQ”.
- A signed-out visitor is sent to `/`.
- “Back to feed” returns to `/feed`.

### AP-02 — See who I am

**As a** member, **I want** my name, handle, and account status on the profile, **so that** I know how InrCliq presents me.

**Acceptance criteria**

- The heading is the resolved full name.
- A verified creator shows a star labelled “Verified creator” and a Verified chip.
- A guardian shows a Family Circle icon that opens `/family-circle`. Adults and minors do not.
- The handle line shows `@handle`, or “No handle set” with a Set now action.
- Chips show the account type (Adult, Guardian, or Minor).
- An adult who has not confirmed their age also shows “Not-verified”.
- A privacy chip shows “Privacy:” plus Strict, Standard, Relaxed, Not set, or Standard for non-minors with no guardian tier.
- A minor with a linked guardian sees the guardian’s name, handle, and a message action to that guardian’s messages. Other account types do not see this row.

### AP-03 — Update my profile photo

**As a** member, **I want** to replace my photo from the profile, **so that** people see a picture instead of an initial.

**Acceptance criteria**

- The avatar shows the photo, or the initial on the avatar color when there is no photo.
- “Edit profile photo” opens a file picker limited to JPEG, PNG, WebP, and GIF.
- A non-image file shows “Choose an image file.” and does not open the editor.
- A valid image opens “Edit profile photo”, defaulting to a square crop.
- Cancel closes the editor and does not change the photo.
- Save uploads the cropped image. The new photo replaces the initial without a full reload of the page, and the completion bar updates.
- A failed upload shows the error from the service, or “Unable to update profile photo.”

### AP-04 — Reach my public profile, edit, and settings

**As a** member, **I want** shortcuts from the profile header, **so that** I can view, edit, or configure the account.

**Acceptance criteria**

- A globe, labelled “View public profile”, is shown only when a public link exists and a handle is set. It opens that public profile.
- A pencil, labelled “Edit profile”, opens `/feed/me/edit`.
- A cog, labelled “Settings”, opens `/feed/me/settings`.

### AP-05 — See how complete my profile is

**As a** member, **I want** a completion bar on the profile, **so that** I know how much setup is left.

**Acceptance criteria**

- The bar shows “Profile completion” and a percent.
- The control is labelled with the percent and opens `/feed/me/completion`.
- The percent uses the same items as the completion screen, including a photo or handle just saved on this page.

### AP-06 — Be asked to confirm I am an adult

**As an** adult who has not confirmed their age, **I want** a prompt on my profile, **so that** I know the next identity step.

**Acceptance criteria**

- The prompt is shown only for account type Adult while identity is not complete.
- Title uses the first name when one exists: “{name}, confirm you are an adult”.
- Copy says to confirm with an ID and a selfie that they are 18 or older.
- “Confirm you are an Adult” opens `/feed/me/adult`.
- “Later” or dismiss hides the prompt on this browser for this member.
- Guardians and minors do not see this prompt. A verified or submitted adult does not see it.

### AP-07 — Be asked to choose a handle

**As a** member with no handle, **I want** a prompt to set one, **so that** people can find and mention me.

**Acceptance criteria**

- The prompt appears when no handle is set and it has not been dismissed on this browser.
- “Set handle” opens the handle dialog on this page. It does not leave the profile.
- “Later” or dismiss hides it for this member on this browser.
- The first-post and share prompts do not appear while this prompt is the active setup step.

### AP-08 — Choose a handle without leaving the profile

**As a** member, **I want** to set my handle in a dialog, **so that** I can finish the prompt in place.

**Acceptance criteria**

- The field is prefixed with `@`. If no handle exists, it is prefilled from the first and last name.
- The handle is required, at most 24 characters, with no spaces, and only letters, numbers, underscores, and periods.
- An invalid value shows the matching field error and is not saved.
- Save stores the handle, closes the dialog, shows `@handle` on the profile, removes Set now, and refreshes completion.
- A handle already taken, or any other save failure, shows the service error, or “Unable to save handle.”
- Closing the dialog does not change the handle.

### AP-09 — Be asked to share a first post

**As a** member who has a handle and no posts, **I want** a prompt to post, **so that** visitors have something to read.

**Acceptance criteria**

- The prompt appears only after a handle exists and the member has zero posts, and only if it has not been dismissed.
- “Create post” opens the create-post dialog.
- “Maybe later” or dismiss hides it for this member on this browser.
- Publishing a post removes this step. The share prompt becomes the next setup prompt.

### AP-10 — Share my profile outside InrCliq

**As a** member who has a handle and at least one post, **I want** a ready-to-paste invite, **so that** I can tell people on other networks.

**Acceptance criteria**

- The prompt names Facebook, Instagram, X, and LinkedIn. Those names are labels. They do not open those sites.
- “Share” copies a message with the member’s name, handle, and absolute public profile link.
- After a successful copy, the button reads “Copied” and the hint tells the member to paste it.
- If there is no public link, the prompt shows “Your public profile link isn’t ready yet.”
- If the clipboard is blocked, it shows “Couldn’t copy. Select the text manually and copy it.”
- “Maybe later” or dismiss hides it for this member on this browser.

### AP-11 — Review my network

**As a** member, **I want** counts and lists for followers, following, and subscriptions, **so that** I can see my relationships in one place.

**Acceptance criteria**

- Three tabs show a count and a label: Followers, Following, Subscriptions.
- The selected tab is Subscriptions unless the address asks for followers or following.
- Each list shows name, handle, avatar or initials, and a verified mark when that person or creator is verified.
- A row with a public profile links to `/feed/profile/{slug}`. A row without one is not a link.
- Subscription rows also show the notify level: All, Personalized, or None.
- Empty lists say:
  - Followers: “When people follow you, they’ll show up here.”
  - Following: “Follow creators from the feed or their profile — they’ll show up here.”
  - Subscriptions: “Subscribe to a creator from their profile to see them here.”
- Counts use the member’s locale grouping. The list updates when someone is unfollowed or removed, including the count.

### AP-12 — Unfollow someone, or remove a follower

**As a** member, **I want** to leave a creator or remove someone who follows me, **so that** my network matches who I want connected.

**Acceptance criteria**

- Following rows with a creator slug show a follow control that is already following. Turning it off removes that row and reduces the Following count.
- Follower rows show a remove control. It asks “Remove {name}?” before it removes them.
- Confirming removal deletes that follower and reduces the Followers count. Cancel or Escape leaves them in the list.
- Subscription rows have no unfollow or remove action on this screen.

---

## 6. Profile information

### AP-13 — Read my account details

**As a** member, **I want** a profile information page, **so that** I can see the details behind the profile card.

**Acceptance criteria**

- `/feed/me/edit` is titled “Profile information · INRCLIQ”.
- The page shows the current handle, or the full name when there is no handle, and a small avatar.
- Basic information shows full name, handle or “Not set”, email, email status (Verified or Not verified), date of birth or “Not provided”, age in years or “Not provided”, location or “Not provided”, and member since (month and year).
- Date of birth, age, location, email status, and member since are read-only on this page.
- “Back to profile” returns to `/feed/me`.

### AP-14 — See my account type and start age confirmation

**As an** adult, **I want** my verification state next to my account type, **so that** I can start age confirmation from my details.

**Acceptance criteria**

- The account type chip matches the profile.
- An adult who is not identity-verified also sees “Not-verified” and “Confirm you are an Adult”, which opens `/feed/me/adult`.
- A verified adult, a guardian, and a minor do not see that link on this page.

### AP-15 — Know that my email change finished

**As a** member who just confirmed a new email, **I want** a confirmation on profile information, **so that** I know the address changed.

**Acceptance criteria**

- Arriving with the email-updated flag shows “Your email address is updated.”
- The email field shows the new address.

### AP-16 — Change my name

**As a** member, **I want** to change my first and last name, **so that** the profile shows the name I use.

**Acceptance criteria**

- The pencil on Full name opens `/feed/me/edit/name` with the current names filled in.
- Both names are required. Each must be 40 characters or fewer.
- Save updates the name and returns to profile information.
- Cancel returns to profile information without saving.
- A failed save shows the service error, or “Unable to save your name.”

### AP-17 — Set or change my handle

**As a** member, **I want** to set or change my @handle from profile information, **so that** my public name stays accurate.

**Acceptance criteria**

- The pencil opens `/feed/me/edit/handle`. The title is “Choose your handle” when none exists, and “Change your handle” when one does.
- An empty handle is prefilled from the name. An existing handle is shown without `@`.
- The same handle rules as AP-08 apply.
- Save returns to profile information and the handle field updates.
- Cancel returns without saving.

### AP-18 — Change my email after I confirm it

**As a** member, **I want** to move the account to a new email only after I open a verification link, **so that** I do not lose access to an address I do not control.

**Acceptance criteria**

- The pencil on Email opens `/feed/me/edit/email`.
- The current address stays the sign-in email until the new one is confirmed.
- An empty or invalid address is rejected. The current address is rejected with “That is already your email address.”
- “Send verification email” sends a link to the new address and tells the member that the current address still applies.
- “Use a different email” returns to the form. “Back to profile information” leaves the sent state.
- Opening an invalid or expired link shows “That verification link is invalid or has expired.”
- If another account claims the address before confirmation, the page shows “That email was claimed by another account before you confirmed it.”
- After a successful confirmation, profile information shows the notice in AP-15.

---

## 7. Profile completion

### AP-19 — See what is left to finish

**As a** member, **I want** a checklist of setup tasks, **so that** I can finish the profile in any order.

**Acceptance criteria**

- `/feed/me/completion` shows “{done} of {total} complete · {percent}%”.
- Adults and guardians see five items: Password setup, Handle setup, Shared your first post, Profile photo, Confirm you are an adult.
- Minors see the same list without Confirm you are an adult.
- A finished item shows a done tick and no action.
- An open item shows its action:

| Item | Meaning of done | Action |
| --- | --- | --- |
| Password setup | Member chose a password | Set a password → `/feed/me/password` |
| Handle setup | A handle is stored | Set handle → `/feed/me/edit/handle` |
| Shared your first post | At least one post | Create post, on this page |
| Profile photo | A photo is stored | Add photo, on this page |
| Confirm you are an adult | Identity submitted or accepted | Confirm → `/feed/me/adult` |

- “Back to profile” returns to `/feed/me`.

### AP-20 — Finish a photo or a post from the checklist

**As a** member, **I want** to add a photo or publish a first post from the checklist, **so that** those items can be completed without hunting for another screen.

**Acceptance criteria**

- Add photo uses the same file types, crop, and save behavior as AP-03. Success refreshes the checklist and marks Profile photo done.
- Create post opens the composer. Closing it refreshes the checklist. A published post marks Shared your first post done.

### AP-21 — Set a password for the first time

**As a** member who still signs in with an email code, **I want** to choose a password, **so that** I can sign in without waiting for a code.

**Acceptance criteria**

- `/feed/me/password` explains that a password lets the member sign in without an email code.
- If a chosen password already exists, the page says so and does not show the form. Changing an existing password is AP-25, from Settings.
- The password must be at least 8 characters and include a letter and a number. The requirement line shows when that is met.
- Save stores the password and returns to the completion checklist, where Password setup is done.
- A failed save shows the service error, or “Unable to save password.”

### AP-22 — Confirm I am 18 or older

**As an** adult or guardian, **I want** to confirm my age with an ID and a selfie, **so that** the account is marked 18 or older.

**Acceptance criteria**

- `/feed/me/adult` is available only when identity is not already complete. A completed member, and every minor, is returned to `/feed/me`.
- A rejected identity sees “Identity verification was rejected. You cannot continue until it is accepted.” and cannot start capture.
- The flow is: introduction, ID type and capture, selfie, a verification wait, then a review of name, date of birth, country, email, and ID type.
- Back on the introduction returns to the completion checklist. Back on later capture steps returns to the previous step.
- “Finish verification” saves the identity. Failure shows the service error, or “Unable to save age verification.”, and stays on the review.
- Success shows “Verification complete” and “Your age is confirmed. This account is marked 18 or older.” Choosing that result returns to `/feed/me`.
- After success, the Not-verified chip and the adult prompt are gone, and the completion item is done.

---

## 8. Settings

### AP-23 — See the settings that belong on this account

**As a** member, **I want** settings grouped the way I manage the account, **so that** I can find password and the other account controls.

**Acceptance criteria**

- `/feed/me/settings` opens on a Settings list. Refreshing the page stays on the list.
- The groups and rows are:

| Group | Row | What the row says |
| --- | --- | --- |
| Account | Email | Address used to sign in and receive codes |
| Account | Password | Change the password for this account |
| Privacy and safety | Privacy | Who can see your profile, posts, and activity |
| Privacy and safety | Blocked accounts | People you have blocked |
| Notifications | Notifications | Follows, comments, bookings, and email alerts |
| Notifications | Messages | Who can message you |
| Preferences | Appearance | Light or dark mode |
| Preferences | Payment methods | Cards and payouts for purchases and bookings |

- Only Password is actionable. The other rows are visible and do not navigate, send anything, or open a panel.
- “Back to profile” returns to `/feed/me`.

### AP-24 — Open password change only when I choose it

**As a** member, **I want** the password screen to wait for me, **so that** opening Settings does not email a code.

**Acceptance criteria**

- Choosing Password replaces the list with “Change password” and does not send a code.
- “All settings” returns to the list.
- The send step says a one-time code will be emailed to the current address and tells the member to open the notification to copy it.
- “Email me a code” is the only way to send the first code.
- A failed send shows the service error, or “Unable to send the password code.”, and stays on the send step.

### AP-25 — Change my password with a one-time code

**As a** member, **I want** to prove I control the email and then set a new password, **so that** someone with the open profile cannot change it silently.

**Acceptance criteria**

- After a code is sent, the corner notification control appears and holds the code for this browser session. It is not shown before the member asks for a code.
- The member enters a 6-digit code. Continue stays unavailable until 6 digits are entered.
- A wrong or expired code shows the service error, or “That code is incorrect or has expired.”
- “Send again” requests a new code.
- After a valid code, the member enters and retypes a password. The same 8-character letter-and-number rule applies. A mismatch shows “Passwords do not match.”
- Confirm saves the password, clears the code notice, and shows “Your password is updated. Use it the next time you sign in.”
- That success state has one “Back to profile” action, in the card footer.
- A failed update shows the service error, or “Unable to update the password.”

---

## 9. Not yet delivered

These rows are on the Settings list so the information architecture is visible. They are not stories that can be accepted against the current product.

| Row | Intended outcome, not built |
| --- | --- |
| Email | Change or confirm the sign-in email from Settings. Email change already exists from Profile information (AP-18), not from this row. |
| Privacy | Choose who can see the profile, posts, and activity. |
| Blocked accounts | See and unblock people. |
| Notifications | Choose alerts for follows, comments, bookings, and email. |
| Messages | Choose who can message the member. |
| Appearance | Choose light or dark mode from Settings. Theme can still be changed from the existing theme control elsewhere in the shell. |
| Payment methods | Add or remove cards and payout methods. |

## 10. Out of scope for this area

- The public profile at `/feed/profile/{slug}`, except as the destination of the globe and of network rows.
- Seller Tools membership, including its own ID and selfie path.
- Family Circle, except the guardian shortcut and the minor’s guardian row.
- Feed, messages, and creator profiles, except where this area links to them.
- Signing in, signing up, and resetting a forgotten password from the signed-out screens.
