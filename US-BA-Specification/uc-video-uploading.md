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
  * If the user attempts to close the modal, the browser triggers a native prompt: *"Upload in progress. Are you sure you want to leave?"*
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

---

## 5. Error Handling & Resilience

* **Network Disruption Handling:**
  * If the connection drops, the progress bar turns gray with a *"Paused — Retrying..."* message while JavaScript attempts to re-establish a connection to resume uploading from the last saved chunk index.

* **Format & Size Validation:**
  * Client-side validation checks file size caps (10 GB web / 4 GB mobile) and media types before chunking.
  * If validation fails, an inline red alert banner appears inside the modal (e.g., *"File exceeds 10 GB limit"* or *"Unsupported file format"*), preventing post submission.
