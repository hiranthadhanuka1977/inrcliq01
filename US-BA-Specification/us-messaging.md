# Messages — User Story Baseline

| Document | `us-messaging.md` |
| --- | --- |
| Audience | Business Analyst — starting point to expand the requirement |
| Module | Direct messages: inbox, a conversation, starting a chat, and the actions on a chat |
| Based on | The product as implemented in November 2026 |
| Updated | 15 November 2026 — sending a post stays on the post, and the chat shows that post as a card with a thumbnail |
| Actors | Member, Other person, Guardian, Platform |
| Primary surfaces | `/feed/messages`, profile **Message**, the send sheet on a feed post, a booking confirmation that lands in Messages |
| Related specs | `us-family-circle-age-zones-parental-controls.md` (section 7 — when a message is held, masked, or stopped for a young person), `us-dm-safety-guardian-review.md` |

---

## 1. How to use this document

This is a **baseline of what Messages already covers**, written as user stories. It is not a full future specification.

Each story says what a person can do today and the acceptance criteria that match the current behaviour. Section 8 lists behaviour that is **shown in the interface but is not a finished product rule yet**. Those items are the natural places to expand.

Messages here means a private conversation between two people. It is not comments on a post, and it is not the guardian’s Family Circle. When a message involves someone under 18, the safety rules in the Family Circle baseline still apply. This document describes what the sender and the recipient see in Messages. It does not replace those guardian stories.

Each person has their own copy of a chat. Clearing or deleting a chat changes that person’s inbox. It does not erase the other person’s copy.

---

## 2. Actors

| Actor | Who they are |
| --- | --- |
| **Member** | A signed-in person using Messages. They can be a fan, a creator, a guardian, or a young person. |
| **Other person** | The person on the other side of the chat. They have their own inbox. |
| **Guardian** | An adult linked to a young person. Their decisions can stop a conversation. Those rules are in the Family Circle baseline. |
| **Platform** | Delivers the message, runs the safety check, stores a report, and keeps each person’s inbox separate. |

A person who is not signed in cannot use Messages. They are told to sign in.

---

## 3. Where a conversation comes from

A chat can start or reopen in any of these ways:

| Way in | What happens |
| --- | --- |
| **Messages** in the left navigation | Opens the inbox. The first conversation is selected when one exists. |
| **+** on the Messages header | Search for a person, then open or create the chat. |
| **Message** on a public profile | Opens the chat with that profile, creating it if it does not exist yet. |
| **Message this creator** when a collection or special requests are unavailable | Same as the profile Message button. |
| After a special-request booking | The member lands in the chat with that creator, on the booking card. |
| Sharing a profile | The chosen people receive a message that contains the profile link. Sharing itself is chosen on the profile’s share page, and only among people who follow the member or whom the member follows. |
| **Share** on a post | Opens a send sheet over the post. The member stays on the post. Each chosen person receives a post card in their chat. See US-MSG-17. |

A new or reopened chat is brought to the top of the member’s list.

On a narrow screen the member sees either the list or the open chat, and can go back to the list. On a wide screen both are visible.

---

## 4. The inbox

### US-MSG-01 — Open Messages

**As a** member  
**I want to** open Messages from the main navigation  
**So that** I can see my conversations in one place.

**Acceptance criteria**

- Messages is in the left navigation.
- A signed-in member sees their conversation list and, when they have at least one chat, the open conversation.
- A person who is not signed in is told to sign in.
- If the list is still loading, the member sees that conversations are loading.
- If there is no conversation, the list says there are none yet, and the chat area asks the member to select a conversation.

### US-MSG-02 — See each conversation at a glance

**As a** member  
**I want** each chat to show who it is with and what was last said  
**So that** I can decide which one to open.

**Acceptance criteria**

- Each row shows the person’s picture or initials, their name, when the last activity was, and a short preview of the latest message.
- A chat with unread messages is marked unread and shows how many are unread.
- Opening a chat clears that chat’s unread count.
- The Messages item in the left navigation shows the total unread count across chats. That total refreshes when the member moves to another page. It is not a live badge while they stay on a different page.
- The open chat’s header shows the person’s name and handle. The name opens their public profile when they have one.
- The header also shows **Online**, **Muted**, or **Blocked** when those apply. See section 8 for Online.

### US-MSG-03 — Search the conversation list

**As a** member  
**I want to** search my inbox  
**So that** I can find a chat without scrolling the whole list.

**Acceptance criteria**

- The search box is labelled “Search messages”.
- The list narrows to chats whose name, handle, or latest preview contains the words typed.
- This search does not look through older messages in the chat. Searching inside one conversation is a separate action (US-MSG-08).
- Clearing the search shows the full list again.

---

## 5. Starting a conversation

### US-MSG-04 — Start a chat from the + button

**As a** member  
**I want to** look someone up and start a conversation  
**So that** I can message a person even when they are not already in my inbox.

**Acceptance criteria**

- **+** is labelled “New message” and opens a search dialog.
- Before anything is typed, the dialog lists people the member follows and people who follow the member, under **Following and followers**.
- Each of those people is marked **Following**, **Follows you**, or both.
- Typing a name or handle also searches the rest of the platform. Those matches appear under **Other people**.
- A person is listed once. Someone in the member’s network is not repeated under Other people.
- The member is not offered their own account.
- People the member has blocked, and people who have blocked the member, are not listed.
- Suspended accounts are not listed under Other people.
- Choosing a person closes the dialog and opens that chat. If a chat already exists, that chat opens. If not, an empty chat is created and the member can write the first message.
- The member cannot start a chat with themself.
- Cancel, clicking outside the dialog, or Escape closes the dialog without starting a chat.
- If the member follows nobody and nobody follows them, the dialog still offers up to 8 other members under **Other people**, so it is not blank. The note that they can search anyone on INRCLIQ appears only when there is nobody to suggest.

### US-MSG-05 — Start a chat from a profile

**As a** member looking at someone’s profile  
**I want** a Message action  
**So that** I can write to them without going back to the inbox first.

**Acceptance criteria**

- **Message** on a public profile opens Messages on that person’s chat.
- The same path is offered as **Message this creator** when their collection or special requests cannot be used.
- If no chat exists yet, one is created.
- If a chat already exists, that chat is opened rather than a second one.
- The address returns to the normal Messages page once the chat is open, so refreshing does not keep creating a new visit to that profile.

---

## 6. Inside a conversation

### US-MSG-06 — Read and send a text message

**As a** member in a chat  
**I want to** read the conversation and send a text message  
**So that** I can talk to that person.

**Acceptance criteria**

- Messages from the member appear on one side. Messages from the other person appear on the other side. Each has a time.
- The composer is a single text line. Send is unavailable until there is text, and while a send is in progress.
- After a successful send, the composer is cleared and the chat stays scrolled to the latest message.
- The inbox preview and time update to the message just sent, and that chat moves to the top.
- The other person receives the message in their own inbox. If they have not muted the chat, their unread count goes up by one.
- While Messages stays open, the list and the open chat refresh so a new reply can appear without a manual reload.
- **Attach a file** sits beside the text field. The member can add up to 4 photos (JPG, PNG, WebP, GIF) or PDFs, each 8MB or smaller. A chosen file appears as a removable chip before it is sent. Photos are checked by the same image safety check used elsewhere.
- Send is available when there is text, at least one ready attachment, or both. It stays unavailable while a file is still uploading.
- In the chat, a photo appears as a small picture and a PDF appears as a named link, inside the same message as any text. The inbox preview uses the text when there is some, otherwise it names the attachment.
- Voice notes, video files, and GIFs that are not a still image cannot be attached. A post sent with **Share** is still its own card, not a file from this button. See US-MSG-17 and section 8.

### US-MSG-07 — Open a link in a message

**As a** member reading a message  
**I want** a web address in the text to be a link  
**So that** I can open what the other person sent.

**Acceptance criteria**

- A web address in the message text is shown as a link.
- A link to somewhere inside INRCLIQ opens inside the product.
- Any other link opens in a new browser tab.
- A profile shared from the share page arrives as a normal message whose text includes that profile’s address, and that address opens the profile.

### US-MSG-08 — Search inside the open chat

**As a** member  
**I want to** search the messages in the chat I have open  
**So that** I can find something that was said earlier.

**Acceptance criteria**

- **Search** in the chat menu opens a search field for this conversation.
- The member sees how many messages contain the words they typed.
- Only the matching messages stay on screen. If none match, the chat says so.
- Escape or **Close** clears the search and shows the conversation again.
- This search covers the messages loaded in this chat. It is not the inbox search.

### US-MSG-09 — Open the other person’s profile

**As a** member  
**I want to** open the other person’s profile from the chat  
**So that** I can see who I am talking to.

**Acceptance criteria**

- When the person has a public profile, their name in the header and **View profile** in the chat menu both open that profile.
- When they do not have a public profile, **View profile** is unavailable and says there is no public profile. Their name in the header is plain text.

### US-MSG-10 — Mute a chat

**As a** member  
**I want to** mute a chat  
**So that** new messages there do not add to my unread count.

**Acceptance criteria**

- **Mute** and **Unmute** are in the chat menu.
- Muting clears the unread count for that chat and shows **Muted** in the header.
- Messages still arrive while the chat is muted. They do not increase the unread count or the navigation badge.
- Unmuting leaves the chat able to count new unread messages again. It does not recreate unread counts for messages that arrived while it was muted.

### US-MSG-11 — Block and unblock

**As a** member  
**I want to** block the other person  
**So that** neither of us can keep sending in that conversation until I unblock them.

**Acceptance criteria**

- **Block** asks for confirmation and names the person. The explanation says the two of you will not be able to message each other until you unblock them.
- After a block, the header shows **Blocked**. The composer is replaced with a note that names the person and says to unblock them in order to send.
- The other person also cannot send. They are told they cannot send messages in this chat. They are not told that they were blocked in those words.
- **Unblock** does not ask for a second confirmation. Sending becomes possible again for both people.
- If the product cannot tell which account the chat belongs to, Block is unavailable and says this account cannot be blocked from here yet.
- A guardian block on a young person’s contact is a different control. It is described in the Family Circle baseline, not in this menu.

### US-MSG-12 — Clear the messages

**As a** member  
**I want to** clear the messages in a chat  
**So that** my copy of the history is empty while the person stays in my list.

**Acceptance criteria**

- **Clear Messages** asks for confirmation. The explanation says this clears the conversation on the member’s side only and cannot be undone.
- Confirming removes the messages from this member’s chat, clears the preview, and clears the unread count.
- The person remains in the inbox, so a new message can still be sent.
- The other person’s copy of the chat is not cleared.
- Cancel, or clicking outside the dialog, leaves the messages in place.

### US-MSG-13 — Delete the chat

**As a** member  
**I want to** delete a chat  
**So that** that person is removed from my inbox.

**Acceptance criteria**

- **Delete Chat** asks for confirmation. The explanation says this removes them from the member’s messages list, affects only that inbox, and cannot be undone.
- Confirming removes the chat from the list and opens another chat if one remains.
- If it was the last chat, the list is empty and the chat area asks the member to select a conversation.
- The other person still has their own copy.
- The member can start a new chat with the same person later. That new chat does not restore the deleted history.

### US-MSG-14 — Report the other person

**As a** member  
**I want to** report the other person from the chat  
**So that** the platform can review what happened.

**Acceptance criteria**

- **Report user** opens a form that asks what happened. The note says the report goes to the platform for review.
- A reason is required. It can be up to 1,000 characters.
- Submitting shows “Report submitted. Our team will review it.” and closes the form.
- The report is stored against the member, the other person, and this chat. It does not, by itself, block the person, delete the chat, or notify them.
- If the product cannot tell which account the chat belongs to, Report is unavailable and says this account cannot be reported from here yet.
- There is no reviewer screen in this story set. See section 8.

---

## 7. Bookings and safety inside the chat

### US-MSG-15 — See a booking in the conversation

**As a** member who booked a special request, or the creator who received it  
**I want** the booking to appear in our chat  
**So that** the request sits with the conversation about it.

**Acceptance criteria**

- Completing a special-request booking opens the chat with that creator and shows a booking card.
- The card shows the request type, occasion, format, duration, how it will be published, the deliver-by date, the total, and the status, for the fields that were provided.
- The person who booked sees it as requested from the creator, and that they are waiting for the creator to accept.
- The creator sees it as requested by the fan, with a prompt to accept or decline from their inbound bookings.
- The card links to that booking in Bookings, on the inbound or outbound list as appropriate.
- Later status notes can appear in the same chat and link back to the same booking.
- Opening Messages with that booking selected scrolls the chat to the card.

### US-MSG-16 — Be warned before a risky message is sent

**As a** member sending a message  
**I want** a warning when the safety check stops the text  
**So that** I can edit it or, where the rules allow, send it anyway.

**Acceptance criteria**

- The check runs when the member sends. An ordinary message is delivered with no warning.
- When the recipient is under 18, a blocked message is titled “Message blocked” and does not tell the sender the category, the severity, the young person’s zone, or that a guardian is involved.
- When the recipient is an adult, the same warning may include the flagged category and a severity from 1 to 6.
- Where sending anyway is allowed, the member can edit the text or send it anyway. Sending anyway follows the delivery rules in the Family Circle baseline: a normal delivery, a masked delivery, or a hold for a guardian.
- Where sending anyway is not allowed, the member is told this message cannot be sent to this account. They can still edit it.
- If the safety check itself cannot be completed for a recipient under 18, the title is “Message not sent” and the member can try again. There is no send-anyway option.
- A guardian restriction, or a limit on messaging anyone under 18, replaces the composer with an explanation and does not offer Send. Those rules are US-DM-02 and US-DM-03 in the Family Circle baseline.
- After a message that creates a temporary limit on messaging under-18 accounts, the chat can show that notice. The member can dismiss the notice. Dismissing it does not remove the limit.

What the other person sees when a message is held, masked, or not delivered, and what a guardian can allow or reject, stays in the Family Circle baseline (US-DM-01 through US-DM-09). Do not rewrite those rules here unless a new story says they change.

### US-MSG-17 — Send a post as a direct message

**As a** member looking at a post  
**I want to** send that post to another member in a direct message  
**So that** they can recognise it in the chat and open the full post.

**Acceptance criteria**

- The share control on a feed post, and the same control while a video is open, opens a send sheet over the post. The member stays on the post.
- Closing the sheet leaves the post, or the open video, where it was. Escape closes the sheet and does not also close the video.
- The sheet shows a preview: who wrote the post, a short line of the text, and a small picture when the post is not members-only. A video that has no picture of its own uses a frame from the clip. A members-only post does not include the photo or the video in the preview or in the message.
- Before anything is typed, the sheet lists people the member follows and people who follow the member. If that network is empty, it offers up to 8 other members under **Other people**, so the sheet is not blank.
- Typing a name or handle searches that network and the rest of the platform, in the same way as New message (US-MSG-04).
- Tapping a person selects them. Selected people appear as chips and can be removed. **Send** stays unavailable until at least one person is selected, and while a send is in progress.
- The member can send to up to 20 people. Each person gets the post in their own chat with the sender. That chat moves to the top of the inbox.
- After a successful send, the sheet says who received it. **Done** closes the sheet.
- Cancel, clicking outside the sheet, or Escape closes it without sending.
- In the chat, the shared post is a card, not a text bubble. It sits on the sender’s side of the conversation.
- A small thumbnail runs down the left edge of the card. It is the photo, or a frame from the video when the post has no photo. A play mark sits on a video. Beside the thumbnail are a quiet **Post** label, the author’s name and handle, a short line of the post, and the time.
- The card uses the same quiet surface as the chat. It has no coloured border.
- Choosing the card opens the full post.
- The inbox preview reads as a shared post — “Shared a post:” plus a short line — not as the stored message text.
- If the safety check refuses one person, the others can still receive it. The sender sees who did not get it.
- A blocked person, a suspended account, or the sender themselves cannot be a recipient.

---

## 8. Shown in the product, not a finished rule yet

Use this list when expanding the requirement. These items appear in Messages, but they are not the full behaviour a later story might assume.

| What the member sees | What is actually true |
| --- | --- |
| **Online** beside a name | A stored flag, mainly from the sample chats created for a new inbox. It is not live presence, and a chat started from **+** or a profile does not turn it on. |
| Familiar names already in a brand-new inbox | The first time someone opens Messages, sample conversations are added if they are not there yet. They are prototype history, not messages that member exchanged. |
| “Our team will review it” after a report | The report is saved. Nobody is assigned, emailed, or shown a review queue in this product. The reported person is not told, and the chat is not blocked. |
| **Other people** in New message | People with a member account, matched on name or handle. A public creator page that is not linked to a member account does not appear here. The profile **Message** button can still open that creator. |
| The network list and the other-people list | The network list shows up to 40 people. A search shows up to 12 other people. When nothing is typed and the member’s network is empty, up to 8 other members are suggested. Longer lists are cut off. |
| Inbox search | Matches the name, the handle, and the latest preview only. |
| Search inside a chat | Hides messages that do not match. It does not step through matches while leaving the rest of the chat visible. |
| The composer | Photos and PDFs can be attached, up to 4 files of 8MB each. There is still no video, voice note, or other file type. A post sent with **Share** is a card in the chat (US-MSG-17), not a file from **Attach a file**. |
| The unread count on Messages in the navigation | Refreshed when the member changes page. It does not tick up on its own while they are elsewhere in the product. |

Also out of this baseline, and useful for a later expansion:

- Group chats, disappearing messages, read receipts, and typing indicators.
- Editing or deleting a single message.
- A moderator queue for member reports.
- Notifying the other person that they were reported or blocked, beyond the send being refused.
- Live online status.
- Letting New message find a creator who has a public page but no member account, in the same list as everyone else.

---

## 9. Suggested expansion order

1. Decide whether the sample conversations should remain for new accounts, or whether a new inbox should start empty.
2. Decide whether **Online** becomes real presence or is removed until it is.
3. Decide who reviews a member’s report, and whether reporting should also block, mute, or notify anyone.
4. Decide whether New message should include public creator pages that are not linked to a member account, and whether the 40 / 12 result limits are enough.
5. Keep clear, delete, and block as inbox actions that do not rewrite the other person’s history, unless a story explicitly says a delete or a block should reach their copy.
6. Keep the under-18 hold, mask, and guardian rules in the Family Circle baseline unless a story explicitly changes them.
