const APP_STORAGE_PREFIX = "inrcliq_";

export function clearApplicationClientStorage() {
  if (typeof window === "undefined") return;

  try {
    for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = sessionStorage.key(index);
      if (key?.startsWith(APP_STORAGE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore storage access errors in restricted browser contexts.
  }
}
