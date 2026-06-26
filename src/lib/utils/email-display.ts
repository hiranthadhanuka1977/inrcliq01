const VERIFY_EMAIL_PILL_MAX_LENGTH = 30;

export function formatVerifyEmailDisplay(email: string) {
  const value = (email || "").trim();
  if (!value || value.length <= VERIFY_EMAIL_PILL_MAX_LENGTH) return value;

  const atIndex = value.indexOf("@");
  if (atIndex <= 0) return value;

  const local = value.slice(0, atIndex);
  const domain = value.slice(atIndex);
  const maxLocalVisible = Math.max(1, VERIFY_EMAIL_PILL_MAX_LENGTH - domain.length - 3);

  if (local.length <= maxLocalVisible) return value;

  return `${local.slice(0, maxLocalVisible)}...${domain}`;
}
