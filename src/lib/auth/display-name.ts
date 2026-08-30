export function deriveUserNameFromEmail(email: string) {
  const local = email.split("@")[0]?.trim() ?? "";
  const parts = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());

  if (parts.length === 0) {
    return {
      firstName: "Guardian",
      lastName: null as string | null,
      fullName: "Guardian",
    };
  }

  const firstName = parts[0]!;
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;
  return {
    firstName,
    lastName,
    fullName: parts.join(" "),
  };
}

export function resolveUserDisplayName(input: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
}) {
  const fromProfile = input.displayName?.trim();
  if (fromProfile) return fromProfile;

  const fromUser = [input.firstName?.trim(), input.lastName?.trim()].filter(Boolean).join(" ");
  if (fromUser) return fromUser;

  return deriveUserNameFromEmail(input.email).fullName;
}

export function resolveUserFirstName(input: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
}) {
  const fullName = resolveUserDisplayName(input);
  return fullName.split(/\s+/)[0] || deriveUserNameFromEmail(input.email).firstName;
}
