export type DmSafetyStatus = "healthy" | "attention";

export function dmContactSafetyStatus(contactId: string): DmSafetyStatus {
  let hash = 0;
  for (let i = 0; i < contactId.length; i += 1) {
    hash = (hash + contactId.charCodeAt(i) * (i + 1)) % 997;
  }
  return hash % 3 === 0 ? "attention" : "healthy";
}
