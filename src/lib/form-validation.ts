export function isValidEmailFormat(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function getEmailValidationError(
  email: string,
  emptyMessage = "Please enter your email address.",
) {
  const trimmed = email.trim();
  if (!trimmed) return emptyMessage;
  if (!isValidEmailFormat(trimmed)) return "Please enter a valid email address.";
  return "";
}

export function getLandingEmailValidationError(email: string) {
  return getEmailValidationError(email, "Please enter your email address.");
}

export function getParentEmailValidationError(email: string) {
  return getEmailValidationError(email, "Please enter your parent or guardian's email address.");
}

export type NameValidationState = {
  message: string;
  firstEmpty: boolean;
  lastEmpty: boolean;
};

export function getNameValidationState(firstName: string, lastName: string): NameValidationState {
  const firstEmpty = !firstName.trim();
  const lastEmpty = !lastName.trim();

  if (!firstEmpty && !lastEmpty) {
    return { message: "", firstEmpty: false, lastEmpty: false };
  }

  let message = "Please enter your last name.";
  if (firstEmpty && lastEmpty) message = "Please enter your first name and last name.";
  else if (firstEmpty) message = "Please enter your first name.";

  return { message, firstEmpty, lastEmpty };
}

export function isPasswordRequirementMet(password: string) {
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password);
}

export function getSignupPasswordFieldError(password: string) {
  if (!password) return "Please enter your password.";
  if (!isPasswordRequirementMet(password)) {
    return "Use at least 8 characters with a mix of letters and numbers.";
  }
  return "";
}

export function validateHandle(value: string) {
  const handle = value.trim();
  if (!handle) return "Please enter a handle.";
  if (handle.length > 24) return "Handle must be 24 characters or fewer.";
  if (/\s/.test(handle)) return "Handles cannot contain spaces.";
  if (!/^[a-zA-Z0-9._]+$/.test(handle)) {
    return "Use letters, numbers, underscores, and periods only.";
  }
  return null;
}

export function isHandleRequirementMet(value: string) {
  const handle = value.trim();
  if (!handle) return false;
  return validateHandle(handle) === null;
}

export function getDefaultAdultDob() {
  const today = new Date();
  let birthYear = today.getFullYear() - 18;
  const jan1ThisYear = new Date(today.getFullYear(), 0, 1);
  if (today < jan1ThisYear) {
    birthYear -= 1;
  }
  return { month: 1, day: 1, year: birthYear };
}

export const DOB_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
