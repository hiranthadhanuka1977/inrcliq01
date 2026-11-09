type FrameListener = (url: string | null) => void;
type DurationListener = (seconds: number | null) => void;

type Job = {
  src: string;
  time: number;
  wantFrame: boolean;
  wantDuration: boolean;
};

const frames = new Map<string, string | null>();
const durations = new Map<string, number | null>();
const frameAttempts = new Map<string, number>();
const durationAttempts = new Map<string, number>();
const frameWaiters = new Map<string, Set<FrameListener>>();
const durationWaiters = new Map<string, Set<DurationListener>>();
const queue: Job[] = [];

let active: Job | null = null;
let activeCancel: (() => void) | null = null;
let pumping = false;

const MAX_ATTEMPTS = 2;

function frameKey(src: string, time: number) {
  return `${src}@${time.toFixed(2)}`;
}

function timesClose(a: number, b: number) {
  return Math.abs(a - b) < 0.02;
}

function jobStillNeeded(job: Job) {
  const key = frameKey(job.src, job.time);
  const frameNeeded = job.wantFrame && !frames.has(key) && (frameWaiters.get(key)?.size ?? 0) > 0;
  const durationNeeded = job.wantDuration && !durations.has(job.src) && (durationWaiters.get(job.src)?.size ?? 0) > 0;
  return frameNeeded || durationNeeded;
}

function releaseIfIdle() {
  if (active && !jobStillNeeded(active)) activeCancel?.();
}

function rememberFrame(key: string, url: string) {
  frames.set(key, url);
  frameAttempts.delete(key);
  frameWaiters.get(key)?.forEach((listener) => listener(url));
}

function rememberDuration(src: string, seconds: number) {
  durations.set(src, seconds);
  durationAttempts.delete(src);
  durationWaiters.get(src)?.forEach((listener) => listener(seconds));
}

function noteFailure(job: Job) {
  if (job.wantFrame) {
    const key = frameKey(job.src, job.time);
    if (!frames.has(key) && (frameWaiters.get(key)?.size ?? 0) > 0) {
      const count = (frameAttempts.get(key) ?? 0) + 1;
      frameAttempts.set(key, count);
      if (count >= MAX_ATTEMPTS) frames.set(key, null);
      frameWaiters.get(key)?.forEach((listener) => listener(null));
    }
  }
  if (job.wantDuration && !durations.has(job.src) && (durationWaiters.get(job.src)?.size ?? 0) > 0) {
    const count = (durationAttempts.get(job.src) ?? 0) + 1;
    durationAttempts.set(job.src, count);
    if (count >= MAX_ATTEMPTS) durations.set(job.src, null);
    if (count >= MAX_ATTEMPTS) durationWaiters.get(job.src)?.forEach((listener) => listener(null));
  }
}

function enqueue(job: Job) {
  const queued = queue.find((item) => {
    if (item.src !== job.src) return false;
    if (item.wantFrame && job.wantFrame) return timesClose(item.time, job.time);
    return true;
  });
  if (queued) {
    if (job.wantFrame) {
      queued.time = job.time;
      queued.wantFrame = true;
    }
    queued.wantDuration = queued.wantDuration || job.wantDuration;
    return;
  }
  queue.push(job);
  void pump();
}

function loadJob(job: Job) {
  return new Promise<"ok" | "fail" | "cancel">((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.crossOrigin = "anonymous";
    video.setAttribute("aria-hidden", "true");
    video.tabIndex = -1;
    video.style.cssText = "position:fixed;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none";
    document.body.appendChild(video);

    let settled = false;
    let retried = false;
    let outcome: "ok" | "fail" | "cancel" = "fail";
    const finish = (next: "ok" | "fail" | "cancel") => {
      if (settled) return;
      settled = true;
      outcome = next;
      window.clearTimeout(timer);
      activeCancel = null;
      video.onloadedmetadata = null;
      video.onseeked = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load();
      video.remove();
      resolve(outcome);
    };
    activeCancel = () => finish("cancel");

    const timer = window.setTimeout(() => finish(jobStillNeeded(job) ? "fail" : "cancel"), 5000);

    const capture = () => {
      const key = frameKey(job.src, job.time);
      if (frames.has(key) && frames.get(key)) {
        finish("ok");
        return;
      }
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 180;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("canvas");
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) {
            finish("fail");
            return;
          }
          rememberFrame(key, URL.createObjectURL(blob));
          finish("ok");
        }, "image/jpeg", 0.72);
      } catch {
        finish("fail");
      }
    };

    const afterMetadata = () => {
      if (!job.wantFrame || frames.has(frameKey(job.src, job.time))) {
        finish(durations.has(job.src) || !job.wantDuration ? "ok" : "fail");
        return;
      }
      const length = Number.isFinite(video.duration) ? video.duration : job.time;
      const time = Math.min(Math.max(job.time, 0.1), Math.max(length - 0.05, 0.1));
      if (Math.abs(video.currentTime - time) < 0.05 && video.readyState >= 2) {
        capture();
        return;
      }
      video.onseeked = () => capture();
      try {
        video.currentTime = time;
      } catch {
        finish("fail");
      }
    };

    video.onerror = () => {
      if (!retried) {
        retried = true;
        video.removeAttribute("crossorigin");
        video.src = job.src;
        return;
      }
      finish("fail");
    };

    video.onloadedmetadata = () => {
      const seconds = video.duration;
      if (Number.isFinite(seconds) && seconds > 0) rememberDuration(job.src, seconds);
      afterMetadata();
    };

    video.src = job.src;
  });
}

async function pump() {
  if (pumping) return;
  pumping = true;
  try {
    while (queue.length) {
      const job = queue.shift();
      if (!job || !jobStillNeeded(job)) continue;
      const key = frameKey(job.src, job.time);
      if ((!job.wantDuration || durations.has(job.src)) && (!job.wantFrame || frames.has(key))) continue;
      active = job;
      const outcome = await loadJob(job);
      active = null;
      if (outcome === "fail") noteFailure(job);
    }
  } finally {
    active = null;
    activeCancel = null;
    pumping = false;
    if (queue.length) void pump();
  }
}

/** One shared reader loads a still and the length. A miss can be tried once more. */
export function watchClipFrame(src: string, time: number, listener: FrameListener) {
  if (typeof document === "undefined") return () => {};
  const key = frameKey(src, time);
  if (frames.has(key)) {
    listener(frames.get(key) ?? null);
    return () => {};
  }
  if ((frameAttempts.get(key) ?? 0) >= MAX_ATTEMPTS) {
    listener(null);
    return () => {};
  }
  const waiters = frameWaiters.get(key) ?? new Set<FrameListener>();
  waiters.add(listener);
  frameWaiters.set(key, waiters);
  const pending = (active?.src === src && active.wantFrame && timesClose(active.time, time))
    || queue.some((job) => job.src === src && job.wantFrame && timesClose(job.time, time));
  if (!pending) enqueue({ src, time, wantFrame: true, wantDuration: true });
  return () => {
    waiters.delete(listener);
    releaseIfIdle();
  };
}

export function watchClipDuration(src: string, listener: DurationListener) {
  if (typeof document === "undefined") return () => {};
  if (durations.has(src)) {
    listener(durations.get(src) ?? null);
    return () => {};
  }
  if ((durationAttempts.get(src) ?? 0) >= MAX_ATTEMPTS) {
    listener(null);
    return () => {};
  }
  const waiters = durationWaiters.get(src) ?? new Set<DurationListener>();
  waiters.add(listener);
  durationWaiters.set(src, waiters);
  const pending = (active?.src === src && active.wantDuration)
    || queue.some((job) => job.src === src && job.wantDuration);
  if (!pending) enqueue({ src, time: 0.1, wantFrame: false, wantDuration: true });
  return () => {
    waiters.delete(listener);
    releaseIfIdle();
  };
}
