export const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Local calendar date as YYYY-MM-DD (matches the booking calendars). */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayDateKey(now = new Date()): string {
  return toDateKey(now);
}

export function isDateKey(value: string): boolean {
  if (!DATE_KEY_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return toDateKey(parsed) === value;
}

/** Persist a calendar day as a timezone-free DATE (UTC midnight). */
export function dateKeyToUtcDate(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export function utcDateToDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateKeysBetween(from: string, to: string): string[] {
  const start = from < to ? from : to;
  const end = from < to ? to : from;
  const keys: string[] = [];
  const cursor = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  while (cursor.getTime() <= last.getTime()) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

export function formatDateKeyLabel(key: string): string {
  return new Date(`${key}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function dateKeyFromBookingWhen(when?: string | null): string | null {
  if (!when?.trim()) return null;
  const iso = when.match(/\d{4}-\d{2}-\d{2}/);
  if (iso && isDateKey(iso[0])) return iso[0];
  const normalized = when.replace("·", " ").replace(/\s+/g, " ").trim();
  const parsed = Date.parse(normalized);
  if (Number.isNaN(parsed)) return null;
  return toDateKey(new Date(parsed));
}
