import { z } from "zod";
import { isValidEmailFormat } from "@/lib/form-validation";

const emailField = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    if (!value) {
      ctx.addIssue({ code: "custom", message: "Please enter your email address." });
      return;
    }
    if (!isValidEmailFormat(value)) {
      ctx.addIssue({ code: "custom", message: "Please enter a valid email address." });
    }
  });

export const emailSchema = emailField;

export const loginCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Please enter the 6-digit code.");

export const signupJoinSchema = z.object({
  firstName: z.string().trim().min(1, "Please enter your first name."),
  lastName: z.string().trim().min(1, "Please enter your last name."),
  email: emailSchema,
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  year: z.number().int().min(1900).max(new Date().getFullYear()),
  country: z.string().trim().min(1, "Please select your country."),
  region: z.string().trim().optional(),
});

export const parentEmailSchema = z.object({
  parentEmail: z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (!value) {
        ctx.addIssue({ code: "custom", message: "Please enter your parent or guardian's email address." });
        return;
      }
      if (!isValidEmailFormat(value)) {
        ctx.addIssue({ code: "custom", message: "Please enter a valid email address." });
      }
    }),
});

export const passwordSchema = z
  .string()
  .superRefine((value, ctx) => {
    if (!value) {
      ctx.addIssue({ code: "custom", message: "Please enter your password." });
      return;
    }
    if (!/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(value)) {
      ctx.addIssue({
        code: "custom",
        message: "Use at least 8 characters with a mix of letters and numbers.",
      });
    }
  });

export const handleSchema = z
  .string()
  .trim()
  .min(1, "Please enter a handle.")
  .max(24, "Handle must be 24 characters or fewer.")
  .regex(/^[a-zA-Z0-9._]+$/, "Use letters, numbers, underscores, and periods only.");

export function parseEmail(value: unknown) {
  return emailSchema.safeParse(value);
}

export function parseLoginCode(value: unknown) {
  return loginCodeSchema.safeParse(value);
}

export function parseSignupJoin(value: unknown) {
  return signupJoinSchema.safeParse(value);
}

export function parseParentEmail(value: unknown) {
  return parentEmailSchema.safeParse(value);
}

export function parsePassword(value: unknown) {
  return passwordSchema.safeParse(value);
}

export function parseHandle(value: unknown) {
  return handleSchema.safeParse(value);
}
