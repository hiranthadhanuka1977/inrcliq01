# Technical Implementation Guide: Video Upload System (InrCliq)

## 1. Executive Summary & Architecture Strategy
To ensure optimal performance and user experience across platforms, **InrCliq** adopts a dual-strategy video upload pipeline:
* **Desktop Web:** Uses direct binary streaming of raw source files via chunked uploads without client-side re-encoding, preserving max media quality and preventing desktop CPU lag.
* **Mobile Apps (iOS/Android):** Performs hardware-accelerated client-side compression before transmission to minimize cellular bandwidth, conserve battery life, and reduce network failure rates.

---

## 2. Technical Specifications & Specifications Matrix

### Upload Specifications by Platform
* **Web Client:** Max file size **10 GB** | Max duration **240 mins**.
* **Mobile Apps:** Max file size **4 GB** | Max duration **240 mins** (Recommended: Stories < 250 MB).
* **Reels / Stories / Ads:** Max file size **4 GB**.

### Web vs. Mobile Architecture Comparison Matrix

| Feature | Mobile App Architecture | Web Client Architecture |
| :--- | :--- | :--- |
| **Client Compression** | **Yes** (Native GPU/Hardware encoder downscales bitrate & resolution) | **No** (Streams original bit-for-bit raw file) |
| **Max File Size Limit** | **4 GB** | **10 GB** |
| **Device Overhead** | High short-term CPU/GPU load during pre-upload compression | Low local CPU load; relies on upload network bandwidth |
| **Transcoding Pipeline** | Client compression followed by backend adaptive re-encoding | Pure backend cloud transcoding pipeline |

---

## 3. Client-Side Implementation Details

### Mobile App Compression Engine
Mobile clients must leverage native hardware encoders (**MediaCodec** on Android, **AVFoundation** on iOS) prior to upload:
1. **Resolution Downscaling:** Scale 4K/60fps source media to 1080p or 720p.
2. **Bitrate Reduction:** Target standard 4–8 Mbps output bitrates.
3. **Audio Normalization:** Resample stereo audio tracks to standard AAC stereo.

### Web Client Processing & Chunking
1. **Direct Uploads:** Bypasses client-side re-encoding (avoiding single-threaded JS/WebAssembly bottlenecks).
2. **Chunking API:** Uses HTML5 `File.slice()` API to divide files into 4 MB–8 MB chunks.
3. **Transmission:** Sends HTTP `POST`/`PUT` chunked requests to storage endpoints over multi-threaded streams.
4. **Local Inspection:** Utilizes HTML5 `<video>` elements exclusively for local previews, metadata parsing (dimensions/duration), and keyframe thumbnail selection.

---

## 4. End-to-End Web UI & Step-by-Step User Workflow

### Step-by-Step UI Experience

* **1. Drag and Drop or File Selection (Instant Local Read)**
  * When the user drags a video file onto the post box or clicks **"Add Photos/Video"**, the UI opens the browser's native file picker or highlights the drop zone.
  * The browser instantly captures a local reference to the file using JavaScript.
  * *Verification:* The "Create Post" modal transitions from a standard text box into a structured media layout.

* **2. Instant Local Thumbnail & Video Preview (HTML5 Blob URL)**
  * Before uploading a single byte to the server, the browser generates a temporary local preview URL (`blob:https://...`) using HTML5 APIs.
  * The user immediately sees a video thumbnail, player frame, and an **"Edit"** pencil icon.
  * Clicking "Edit" allows cropping the video, choosing a custom thumbnail frame, or adding closed captions directly inside the post modal.
  * *Verification:* The video player preview appears in the draft post without any lag or spinner.

* **3. Live Upload Progress Indicator (Byte Tracking)**
  * As the browser streams 4 MB–8 MB chunks to storage servers, a progress bar overlay or percentage ring (e.g., *"Uploading 42%..."*) appears over the video thumbnail.
  * The **"Post"** button remains temporarily disabled or switches to a pending state.
  * If the user closes the Create Post dialog (**"X"**, Escape, or clicking outside), the app shows its *"Save this post as a draft?"* prompt (see Step 15). If the user closes the browser tab, refreshes, or leaves the page while an upload is in progress, the browser shows its standard leave-page warning (e.g., *"Leave site? Changes you made may not be saved."*); leaving anyway stops the upload and nothing is saved.
  * *Verification:* The percentage increments smoothly as chunks are acknowledged by the backend.

* **4. Cloud Processing Feedback (Backend Transcoding)**
  * Once the upload reaches 100%, the browser hands off to the cloud transcoding queue, and the progress bar changes state to *"Processing video..."*.
  * The user is allowed to click **"Post"** immediately without waiting for transcoding to finish.
  * The draft modal closes, and a small floating notification toast appears at the bottom-left: *"Your video is processing. We'll notify you when it's ready to view."*
  * *Verification:* The floating toast confirms the job was successfully handed off to backend workers.

* **5. Final Completion Notification (Feed Readiness)**
  * While the user continues browsing, background notification listeners poll for completion.
  * The notification bell icon in the top header lights up with a red dot, accompanied by a push notification: *"Your video is ready. You can now watch, edit, or delete it."*
  * *Verification:* Clicking the notification opens the published post directly on the user's profile or feed in adaptive stream quality.

* **6. Selecting Multiple Photos and Videos (Mixed Media Post)**
  * In the native file picker, the user can select several photos and videos at once, or drop several files onto the post box together.
  * A post holds up to **6** items in any mix of photos, videos, and one GIF from the **"GIF"** picker (choosing another GIF replaces the current one).
  * Photos can be JPG, PNG, WebP, or GIF up to 8 MB each; videos can be MP4, MOV, or WebM up to 10 GB and 240 minutes each.
  * If more files are picked than there is room for, only the first ones that fit are added and an inline message explains: *"A post can have up to 6 photos and videos, so only the first 2 files were added."*
  * *Verification:* Every accepted file appears in the draft post, and files that break the limits are left out.

* **7. Collage Preview in Create Post**
  * Selected items are arranged in a collage that adapts to the count: one item fills the frame, two sit side by side, three show one wide tile above two, four form a 2×2 grid, and five show two tiles above three.
  * With 6 items, the fifth tile shows a **"+1"** overlay for the item that does not fit.
  * Video tiles show a play icon, and every tile shows its own status: photos show *"Checking photo..."* then *"Uploading photo..."*, while videos show *"Preparing video..."*, *"Uploading 42%..."*, then *"Processing video..."*.
  * Once a trimmed video finishes uploading, its tile shows a scissors badge with the trimmed length (e.g., *"0:12"*).
  * *Verification:* Each tile's progress updates on its own, and the **"Post"** button reads *"Uploading..."* until every item is ready.

* **8. Adding and Removing Photos and Videos**
  * The user adds more items at any time with the photo/video icon under **"Add to your post"**, or with **"Add photos/videos"** inside the Photos/Videos screen (Step 9); the button is disabled once the post has 6 items.
  * In the Photos/Videos screen, each card has an **"X"** button in its top-right corner that removes that single item, or cancels its upload if it is still uploading. The X appears on hover or keyboard focus, and is always visible on touch screens and small screens.
  * The **"X"** in the top-right corner of the collage removes all photos and videos at once and stops any uploads still in progress.
  * *Verification:* The collage re-arranges immediately to match the remaining items, and disappears when the last item is removed.

* **9. Edit vs. Edit All (Photos/Videos Screen)**
  * The button in the top-left corner of the collage reads **"Edit"** for a single item and **"Edit all"** for two or more.
  * With a single video, **"Edit"** opens the video editor directly (Step 11); otherwise it opens the **"Photos/Videos"** screen inside the modal.
  * The Photos/Videos screen has a back arrow and the title *"Photos/Videos"*, and shows every item as a card in two columns (one column on small screens).
  * Each card has an **"Edit"** button (top-left) that opens the photo editor (Step 10) or the video editor (Step 11), the **"X"** remove button (Step 8), and a **"Caption"** box underneath for up to 500 characters. Photos can be edited once their upload finishes; videos can be edited while still uploading.
  * The back arrow, **"Done"**, or the Escape key returns to the post with all captions kept.
  * *Verification:* Each caption appears with its item when the post is viewed (Step 14).

* **10. Editing a Photo (Crop & Rotate)**
  * The **"Edit photo"** screen opens over the post, showing the photo with a crop box.
  * The user drags the crop box to move it, or drags its corners to resize it, and can pick a crop shape: **Free**, **Original**, **1:1**, **4:5**, or **16:9**.
  * **"Rotate left"** and **"Rotate right"** turn the photo in 90° steps.
  * **"Save"** applies the edit: the edited photo goes through the safety check again and replaces the original in the post. **"Cancel"** or the Escape key closes the editor without changes.
  * *Verification:* The edited version replaces the original in the collage and on its card.

* **11. Editing a Video: Trim**
  * The **"Edit video"** screen opens with a preview and two tabs, **Trim** and **Thumbnail**. **"Done"** applies the changes, and **"Cancel"** or the Escape key discards them.
  * The **Trim** tab shows a filmstrip of the whole video with a start handle and an end handle. The user drags the handles with a mouse or finger, or focuses a handle and uses the arrow keys for 1-second steps (hold Shift for 5 seconds).
  * The parts outside the selected range are dimmed, and the **Start**, **End**, and **Length** readouts update as the handles move. The selection can't be shorter than 1 second.
  * The play button (or tapping the preview) plays only the selected part and stops at its end; **"Reset"** restores the whole video.
  * Trimming does not cut the file: the full video still uploads, and playback simply starts and stops at the chosen points.
  * *Verification:* After **"Done"**, the video's tile shows the trimmed-length badge, and reopening the editor shows the same trim.

* **12. Editing a Video: Thumbnail**
  * The **Thumbnail** tab offers 8 frames taken from the trimmed part of the video, plus a slider for picking any moment within the trimmed range.
  * If a new trim leaves the current thumbnail outside the selected range, the thumbnail moves to the start of the trim.
  * After **"Done"**, the new thumbnail shows on the tile straight away with a *"Saving thumbnail..."* status while it goes through the same safety check as photos.
  * If the new thumbnail is flagged or can't be saved, the previous thumbnail is kept and a message explains why (e.g., *"We couldn't save the new thumbnail, so the previous one was kept. Try again."*).
  * *Verification:* The chosen frame becomes the video's cover in the collage and in the feed.

* **13. Per-Photo Safety Check**
  * Each photo is checked one at a time before it uploads (*"Checking photo..."*).
  * A flagged photo is removed from the post with a red warning naming the reason, while the remaining photos and videos carry on uploading.
  * If the check can't run, the photo is left out with an *"Unable to verify image"* warning, and the user can try again or choose a different image.
  * Each video's automatic thumbnail is checked the same way: if it is flagged, that video is left out of the post; if the check can't run, the video is posted without a thumbnail.
  * *Verification:* Only items that pass the check remain in the collage, and the warning states *"This photo was not added to your post."*

* **14. Posting and Viewing a Mixed Media Post**
  * Once every item is ready, the user clicks **"Post"**; item captions are checked together with the post text before the post is published.
  * In the feed, the post shows the same collage (with the **"+N"** tile when there are more than five items). Video tiles show their thumbnail and a play icon, and nothing plays automatically.
  * Tapping a tile opens the full-screen viewer at that item. The user steps through the items in order with the arrows or the left/right arrow keys, with a counter (e.g., *"2 / 6"*) and each item's caption shown.
  * Only the tapped video starts playing by itself; other videos wait for the user to press **Play**.
  * A trimmed video plays only its selected range, with a control bar that shows the trimmed time (e.g., *"0:05 / 0:12"*) and stops at the trim end.
  * *Verification:* The viewer shows every item in the same order as the Create Post collage.

* **15. Closing Create Post with Content in Progress (Save as Draft)**
  * When the post has any text, photo, video, GIF, caption, or edit (including while uploads are still in progress), clicking the **"X"** in the top-right corner of Create Post, pressing Escape, or clicking outside the modal opens a *"Save this post as a draft?"* dialog with the message *"If you discard now, you'll lose this post."* If the post is empty, Create Post simply closes with no prompt.
  * The dialog offers **"Delete draft"**, **"Save as draft"**, and an **"X"**; the X closes the dialog and returns to the post with nothing lost.
  * **"Save as draft"** closes Create Post and keeps the post's text, photos, videos, GIF, captions, edits (including trim and thumbnail), tags, feeling, location, and post settings. Reopening Create Post restores the draft. Only one draft is kept, so saving a new draft replaces the previous one.
  * Photos and videos that have finished uploading are kept in the draft; any item still uploading is not saved and needs to be added again.
  * **"Delete draft"** opens a second dialog, *"Delete this draft?"*, with the message *"If you delete this draft, you'll lose it permanently."* **"Cancel"** or the **"X"** returns to the post with nothing lost, and **"Delete draft"** permanently discards the post, stops any uploads in progress, and closes Create Post.
  * This dialog applies only to closing Create Post within the app. Closing the browser tab, refreshing, or leaving the page during an upload shows the browser's own warning instead (see Step 3), and nothing is saved as a draft.
  * *Verification:* After **"Save as draft"**, reopening Create Post shows the same text, media, and captions; after **"Delete draft"** is confirmed, Create Post opens empty.

---

## 5. Error Handling & Resilience

* **Network Disruption Handling:**
  * If the connection drops, the progress bar turns gray with a *"Paused — Retrying..."* message while JavaScript attempts to re-establish a connection to resume uploading from the last saved chunk index.

* **Format & Size Validation:**
  * Client-side validation checks file size caps (10 GB web / 4 GB mobile) and media types before chunking.
  * If validation fails, an inline red alert banner appears inside the modal (e.g., *"File exceeds 10 GB limit"* or *"Unsupported file format"*), preventing post submission.

* **Media Limit Handling:**
  * If the user picks more items than the post has room for, only the files that fit are added and an inline message explains the limit. Once the post has 6 items, *"A post can have up to 6 photos and videos."* appears and **"Add photos/videos"** is disabled.

* **Photo Safety Check Handling:**
  * A flagged photo is dropped with a red warning naming the flagged category and stating *"This photo was not added to your post."*, while the rest of the post continues uploading.
  * If the safety check can't run, an *"Unable to verify image"* warning appears and the photo is not added.
  * If an edited photo is flagged, the edit is not saved and the photo editor stays open with the reason.

* **Thumbnail Save Failure:**
  * If a newly picked video thumbnail is flagged or can't be saved, the previous thumbnail is kept and an inline message explains why; the trim is still applied.

* **Draft Save Failure:**
  * If the draft can't be saved, an inline message appears (e.g., *"We couldn't save your draft. Try again."*), Create Post stays open, and nothing is lost.
