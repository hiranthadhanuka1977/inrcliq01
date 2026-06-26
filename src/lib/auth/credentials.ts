import bcrypt from "bcryptjs";

export {
  getSignupPasswordFieldError,
  isHandleRequirementMet,
  isPasswordRequirementMet,
  isValidEmailFormat,
  validateHandle,
} from "@/lib/form-validation";

export function suggestHandle(firstName: string, lastName: string) {
  const first = (firstName || "user").toLowerCase().replace(/[^a-z0-9]/g, "");
  const last = (lastName || "").charAt(0).toLowerCase();
  const base = `${first}${last}`.slice(0, 20) || "user";
  return `${base}${String(new Date().getFullYear()).slice(-2)}`.slice(0, 24);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}
