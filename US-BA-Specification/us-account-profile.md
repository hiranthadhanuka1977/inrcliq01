# Account Profile — User Story Baseline

| Document | `us-account-profile.md` |
| --- | --- |
| Audience | Business Analyst — starting point to expand the requirement |
| Module | The signed-in member’s own account: identity, photo, name, handle, email, and the people connected to the account |
| Based on | The product as implemented in November 2026 |
| Updated | 17 November 2026 |
| Actors | Member, Guardian, Platform |
| Primary surfaces | `/feed/me`, `/feed/me/edit`, `/feed/me/edit/name`, `/feed/me/edit/handle`, `/feed/me/edit/email` |
| Related specs | `us-main-feed.md` (public profile, follow, subscribe), `us-messaging.md` (message the guardian), `us-family-circle-age-zones-parental-controls.md` (protection level and guardian link), `us-child-onboarding-and-approval.md` (how the account type and date of birth were set) |

---

## 1. How to use this document

This is a **baseline of what Account Profile already covers**, written as user stories. It is not a full future specification.

Each story says what a person can do today and the acceptance criteria that match the current behaviour. Section 8 lists details that are **shown in the interface but are not a finished product rule yet**. Those items are the natural places to expand.

Account Profile is the member’s own hub. It is not the public page other people open. The globe on the hub opens that public page when the member already has a handle. Follow, message, collection, and special requests on someone else’s page stay in the feed and service-request baselines.

A person who is not signed in does not see this hub. The page sends them away.

---

## 2. Actors

| Actor | Who they are |
| --- | --- |
| **Member** | A signed-in person looking at their own account. They can be an adult, a guardian, or a young person. |
| **Guardian** | The adult linked to a young person’s account. Their name can appear on that young person’s hub, and a guardian sees a way into Family Circle. |
| **Platform** | Stores the name, handle, photo, and email, checks that a handle or email is not already taken, and keeps the follower lists. |

---

## 3. Where the member opens it

| Way in | What happens |
| --- | --- |
| Profile chip in the left navigation | Opens Account Profile. |
| **Profile** in the profile menu, and **Profile** in the mobile More sheet | Opens Account Profile. |
| **Edit profile** on the hub | Opens Profile information. |
| **View public profile** on the hub | Opens the member’s public page. Shown only when a handle is already set. |
| **Back to feed** | Returns to Home. |
| **Back to profile** on Profile information | Returns to the hub. |

The hub opens on **Subscriptions**. A link can open **Followers** or **Following** instead (`?tab=followers` or `?tab=following`).

---

## 4. The hub

### US-ACC-01 — Open my account

**As a** member  
**I want to** open my account from the main navigation  
**So that** I can see who I am on InrCliq and who is connected to me.

**Acceptance criteria**

- Profile in the navigation opens `/feed/me`.
- A signed-in member sees their name, handle or “No handle set”, account type, and the three network counts.
- A person who is not signed in is not shown the hub.
- If the account has no profile record yet, the hub still opens from the signed-in account. A missing session does not show another person’s account.

### US-ACC-02 — See who I am

**As a** member  
**I want** my account to show my identity at a glance  
**So that** I can tell which account I am using and how the platform classifies it.

**Acceptance criteria**

- The heading is the member’s full name. If no name is stored, a display name is still shown from the account.
- The handle is shown as `@handle`. If none is set, the hub says “No handle set” and offers **Set now**.
- Chips show the account type: **Adult**, **Guardian**, or **Minor**.
- A creator who is verified shows a verified mark and a **Verified** chip. That mark is creator verification. It is not the same as “email verified”.
- A **Privacy** chip shows the protection level when one applies: **Strict**, **Standard**, or **Relaxed**, with a short description of what that level means for a minor. Adult and guardian accounts show the standard description for that account type. A minor with no approved protection level is told that a parent or guardian has not set one yet.
- The member cannot change account type, date of birth, or privacy from this hub. Those were set in onboarding or by the guardian.

### US-ACC-03 — Change my profile photo

**As a** member  
**I want to** replace my profile photo  
**So that** people see the picture I choose.

**Acceptance criteria**

- **Edit profile photo** opens a file picker for JPG, PNG, WebP, or GIF.
- A file that is not an image is refused before the editor opens.
- The member crops the picture in an editor titled “Edit profile photo”, starting from a square crop. They can cancel and keep the current photo.
- Saving stores the picture and shows it on the hub. The same picture is the one used where the account photo appears.
- The picture must be 8MB or smaller. A larger file is refused.
- If the save fails, the member is told the photo could not be updated, and the previous photo stays.

### US-ACC-04 — Set or change my handle

**As a** member  
**I want** a unique @name  
**So that** people can find and mention me.

**Acceptance criteria**

- **Set now** on the hub opens a dialog to choose a handle. The same rules are on **Profile information → Handle**.
- If no handle exists yet, the field starts with a suggestion from the member’s name. The member can change it.
- A handle is required. It is at most 24 characters, has no spaces, and uses only letters, numbers, underscores, and periods.
- A handle already used by another account is refused. The member keeps their previous handle.
- Saving a new handle returns the member to Profile information. Saving from the hub dialog updates the handle on the hub, including the public-profile link.
- The member can change a handle later. The new value must still be unique.

### US-ACC-05 — See a linked guardian, or open Family Circle

**As a** young person or a guardian  
**I want** the family relationship to be visible on my account  
**So that** I can reach the adult responsible for the account, or the family tools I manage.

**Acceptance criteria**

- A minor with a linked guardian sees that guardian’s name and handle, and a control to message them. That control opens Messages with the guardian.
- A minor without a linked guardian does not see a guardian row.
- A guardian sees a Family Circle mark beside their name. It opens Family Circle.
- An adult who is not a guardian does not see the Family Circle mark or a guardian row.

### US-ACC-06 — Get a nudge for the next step

**As a** member setting up my account  
**I want** one prompt for the step I have not finished  
**So that** I know whether to choose a handle, publish, or share.

**Acceptance criteria**

- If there is no handle, the hub asks the member to set one. **Set now** opens the handle dialog.
- If there is a handle and the member has no posts, the hub asks them to create a first post and can open the composer.
- If there is a handle and at least one post, the hub offers a share prompt for the public profile.
- Only one of those three prompts is shown.
- Dismissing a prompt hides it on that browser. It can appear again on another browser or after the local dismissal is cleared. Dismissing it does not change the account.

---

## 5. People connected to the account

### US-ACC-07 — See followers, following, and subscriptions

**As a** member  
**I want** to switch between the people who follow me, the creators I follow, and the creators I subscribe to  
**So that** I can review those relationships in one place.

**Acceptance criteria**

- Three counts are always visible: **Followers**, **Following**, and **Subscriptions**. The open list matches the selected count.
- The hub opens on Subscriptions unless the address asks for Followers or Following.
- Each person shows a picture or initials, their name, their handle, and a verified mark when they are a verified creator.
- A subscription row also says whether notifications are **All**, **Personalized**, or **None**.
- Choosing a person opens their public profile when they have one.
- An empty list explains what will appear there: followers once people follow the member, following once the member follows creators, subscriptions once the member subscribes.

### US-ACC-08 — Unfollow from my list

**As a** member  
**I want to** unfollow someone from my Following list  
**So that** I can end that follow without opening their profile first.

**Acceptance criteria**

- Each person on **Following** has an unfollow control.
- Unfollow removes that person from the list and reduces the Following count.
- Followers and Subscriptions do not offer unfollow on this hub.

### US-ACC-09 — Remove a follower

**As a** member  
**I want to** remove someone from my followers  
**So that** they no longer follow me.

**Acceptance criteria**

- Each person on **Followers** has a remove control.
- Remove asks the member to confirm. Escape or clicking outside the confirmation closes it without a change.
- Confirming removes that person from the list and reduces the Followers count.
- If the removal fails, the member is told, and the person stays on the list.
- Removing a follower does not block them and does not delete their account.

---

## 6. Profile information

### US-ACC-10 — Read my account details

**As a** member  
**I want** a single page of my account details  
**So that** I can see what the platform stores and which fields I can change.

**Acceptance criteria**

- **Edit profile** on the hub opens Profile information.
- The page shows full name, handle, email, email status (**Verified** or **Not verified**), date of birth, age, location, member since, and account type.
- A missing date of birth, age, or location is shown as **Not provided**. A missing handle is shown as **Not set**.
- Name, handle, and email each have an edit control. Date of birth, age, location, email status, member since, and account type do not.
- After a confirmed email change, the page says the email address is updated.
- **Back to profile** returns to the hub.

### US-ACC-11 — Change my name

**As a** member  
**I want to** change my first and last name  
**So that** people see the name I choose.

**Acceptance criteria**

- The form asks for a first name and a last name. Both are required.
- Each name is at most 40 characters.
- Saving updates the name on the account and returns to Profile information.
- Cancel or **Back** leaves the previous name in place.

### US-ACC-12 — Change my email

**As a** member  
**I want to** move my account to a new email address  
**So that** I can sign in with the address I actually use.

**Acceptance criteria**

- The form asks for the new address and shows the current one.
- The current address stays the account email until the member opens the verification link. The page says that explicitly.
- An empty or invalid address is refused. The current address is refused as “already your email”. An address used by another account is refused.
- A valid new address sends a verification message to that address. Another message cannot be sent until 30 seconds after the previous request.
- The link lasts 24 hours. An expired or invalid link does not change the email, and the member is told the link is invalid or has expired.
- If another account takes the new address before the link is opened, confirmation fails and the current email stays.
- Opening a valid link switches the account email and returns the member to Profile information with the updated-email notice.

---

## 7. Shown in the product, not a finished rule yet

Use this list when expanding the requirement. These items appear on Account Profile, but they are not the full behaviour a later story might assume.

| What the member sees | What is actually true |
| --- | --- |
| **Privacy** chip | It displays the protection level already stored for a minor, or a fixed description for an adult or guardian. The member does not pick a new level here. |
| **Verified** | Creator verification. Email has its own **Verified / Not verified** line on Profile information. |
| Share prompt | A prompt to share the public profile after the member has a handle and at least one post. It is not a finished share-to-Facebook, Instagram, X, or LinkedIn flow. |
| First-post prompt | Opens the composer from the hub. Posting rules stay in the feed baseline. |
| Prompt dismissal | Stored in the browser only. Another device can show the prompt again. |
| Subscriptions list | The member can see who they subscribe to and the stored notify level. This list does not unsubscribe or change the notify level. That stays on the creator’s public profile. |
| Following and followers | The lists show the relationships stored for this account. They are not a search of the whole platform. |
| Location, date of birth, and account type | Shown when the account has them. They are not edited on Profile information. |
| Bio, banner, and interests | Not edited on Account Profile. A creator’s public page and Seller public-profile settings are separate surfaces. |

Also out of this baseline, and useful for a later expansion:

- Letting the member change date of birth, country, or account type, and what that does to age zone and guardian rules.
- A bio, banner, and pronouns editor on this hub.
- Cancelling a subscription or changing its notify level from the Subscriptions list.
- Blocking someone from the Followers list, rather than only removing the follow.
- Deactivating or deleting the account from this hub.
- Making the share prompt actually post to another network.

---

## 8. Suggested expansion order

1. Decide which identity fields a member may change after sign-up, and which stay locked because age zone or a guardian depends on them.
2. Decide whether Subscriptions on this hub should cancel or only display, and whether notify level is edited here or only on the creator’s page.
3. Decide whether removing a follower should also offer block.
4. Decide whether bio and banner belong on Account Profile or only on the public creator page and Seller settings.
5. Keep the public profile, follow, and subscribe actions in the feed baseline unless a story explicitly moves them onto this hub.
6. Keep guardian protection levels and Family Circle behaviour in the Family Circle baseline unless a story explicitly lets the member change them here.
