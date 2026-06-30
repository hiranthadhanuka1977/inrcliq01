import { clearApplicationClientStorage } from "@/lib/auth/app-storage";

export async function resetPrototype(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    const data = await response.json();

    if (!response.ok) {
      return { ok: false, error: data.error ?? "Unable to reset prototype session." };
    }

    clearApplicationClientStorage();
    window.location.assign(data.redirectTo ?? "/");
    return { ok: true };
  } catch {
    return { ok: false, error: "Unable to reset prototype session." };
  }
}
