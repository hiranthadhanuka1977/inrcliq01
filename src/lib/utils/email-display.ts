const VERIFY_EMAIL_PILL_MAX_LENGTH = 30;
const SOCIAL_PROTOTYPE_EMAIL_DOMAIN = "@prototype.inrcliq.local";

export function isSocialPrototypeEmail(email: string) {
  return (email || "").trim().toLowerCase().endsWith(SOCIAL_PROTOTYPE_EMAIL_DOMAIN);
}

export function formatSocialSignupEmailDisplay(email: string) {
  const local = (email || "").trim().split("@")[0] ?? "";
  const namePart = local.split("+")[0] ?? local;
  const dotIndex = namePart.indexOf(".");
  const firstName = dotIndex >= 0 ? namePart.slice(0, dotIndex) : namePart;
  const lastName = dotIndex >= 0 ? namePart.slice(dotIndex + 1) : "";

  function maskFirstName(name: string) {
    if (name.length <= 2) return name;
    if (name.length === 3) return `${name[0]}*${name[2]}`;
    return `${name.slice(0, 2)}**${name[name.length - 1]}`;
  }

  function maskLastName(name: string) {
    if (!name) return "****";
    return `${"*".repeat(4)}${name[name.length - 1]}`;
  }

  const localDisplay = lastName
    ? `${maskFirstName(firstName)}.${maskLastName(lastName)}`
    : maskFirstName(firstName);

  const oauthPart = local.split("+")[1] ?? "";
  const domainMask = oauthPart.startsWith("apple.") ? "a***.com" : "g***.com";

  return `${localDisplay}@${domainMask}`;
}

export function formatPasswordPageEmailDisplay(email: string) {
  if (isSocialPrototypeEmail(email)) {
    return formatSocialSignupEmailDisplay(email);
  }
  return email;
}

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
