import { randomInt } from "node:crypto";
import { z } from "zod";
import { AccountType } from "@/generated/prisma/client";
import { COUNTRIES, US_STATES } from "@/lib/constants/locations";
import { initialsFromName, uniquePublicSlug } from "@/lib/feed/set-user-handle";
import { ageZoneToPrisma } from "@/lib/guardian/user-age-zone";
import { prisma } from "@/lib/prisma";
import { AI_USER_SIGNUP_METHOD } from "@/lib/settings/users";
import { parseDateOfBirth } from "@/lib/utils/age";
import { ageInYears, resolveAgeZoneFromDateOfBirth } from "@/lib/utils/age-zone";
import { emailSchema, handleSchema } from "@/lib/validation";

/** Minimum age of an AI user on the day it is created. */
export const AI_USER_MIN_AGE = 18;

/** Reserved for documentation (RFC 2606), so generated addresses never reach a real inbox. */
const AI_USER_EMAIL_DOMAIN = "example.com";

const FIRST_NAMES = [
  "Amelia", "Aria", "Ava", "Chloe", "Clara", "Elena", "Ella", "Emma", "Freya", "Grace",
  "Hannah", "Isla", "Ivy", "Leah", "Lily", "Maya", "Mia", "Naomi", "Nora", "Olivia",
  "Priya", "Ruby", "Sara", "Sofia", "Zoe", "Aiden", "Arjun", "Caleb", "Daniel", "Ethan",
  "Felix", "Gabriel", "Henry", "Isaac", "Jack", "Kavin", "Leo", "Liam", "Lucas", "Mason",
  "Nathan", "Noah", "Oliver", "Omar", "Rohan", "Ryan", "Samuel", "Theo", "Tyler", "Zane",
];

const LAST_NAMES = [
  "Anderson", "Bailey", "Bennett", "Brooks", "Carter", "Collins", "Cooper", "Davies", "Edwards", "Ellis",
  "Fernando", "Fisher", "Foster", "Gray", "Hayes", "Hughes", "Jayasuriya", "Kapoor", "Kelly", "Khan",
  "Mendis", "Mitchell", "Morgan", "Murphy", "Nair", "Parker", "Patel", "Perera", "Price", "Reed",
  "Reyes", "Rivera", "Robinson", "Russell", "Sanders", "Silva", "Singh", "Stewart", "Sullivan", "Taylor",
  "Turner", "Walker", "Ward", "Watson", "Wells", "Wickramasinghe", "Wilson", "Wood", "Wright", "Young",
];

const AVATAR_COLORS = ["#6b9fff", "#8b7cf6", "#f59e0b", "#10b981", "#ef6f6c", "#14b8a6", "#ec4899", "#64748b"];

const COUNTRY_CODES = COUNTRIES.map((country) => country.code as string);

export type AiUserDraft = {
  firstName: string;
  lastName: string;
  email: string;
  handle: string;
  /** `YYYY-MM-DD`. */
  dateOfBirth: string;
  country: string;
  region: string | null;
};

export type AiUserDraftResponse = { draft: AiUserDraft; latestDateOfBirth: string };

function pick<T>(items: readonly T[]): T {
  return items[randomInt(items.length)]!;
}

function toDateInput(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Today minus AI_USER_MIN_AGE years (29 Feb falls back to 28 Feb). */
export function latestAiUserDateOfBirth(today = new Date()) {
  const year = today.getFullYear() - AI_USER_MIN_AGE;
  const month = today.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  return toDateInput(year, month, Math.min(today.getDate(), daysInMonth));
}

function handleBase(firstName: string, lastName: string) {
  const clean = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${clean(firstName)}.${clean(lastName)}`.slice(0, 19);
}

async function isHandleTaken(handle: string) {
  const [user, profile] = await Promise.all([
    prisma.user.findFirst({ where: { handle: { equals: handle, mode: "insensitive" } }, select: { id: true } }),
    prisma.userProfile.findFirst({
      where: { handle: { equals: `@${handle}`, mode: "insensitive" } },
      select: { id: true },
    }),
  ]);
  return Boolean(user || profile);
}

async function isEmailTaken(email: string) {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  return Boolean(user);
}

/** A random identity whose handle and email are free right now. */
export async function generateAiUserDraft(): Promise<AiUserDraftResponse> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const base = handleBase(firstName, lastName);
    let handle = base;
    if (await isHandleTaken(handle)) {
      handle = `${base}${randomInt(10, 10_000)}`;
      if (await isHandleTaken(handle)) continue;
    }

    const email = `${handle}@${AI_USER_EMAIL_DOMAIN}`;
    if (await isEmailTaken(email)) continue;

    const country = pick(COUNTRY_CODES);
    const latestDateOfBirth = latestAiUserDateOfBirth();
    return {
      draft: {
        firstName,
        lastName,
        email,
        handle,
        dateOfBirth: latestDateOfBirth,
        country,
        region: country === "US" ? pick(US_STATES) : null,
      },
      latestDateOfBirth,
    };
  }
  throw new Error("Couldn't find a free handle. Try again.");
}

const aiUserInputSchema = z
  .object({
    firstName: z.string().trim().min(1, "Please enter a first name.").max(50, "First name is too long."),
    lastName: z.string().trim().min(1, "Please enter a last name.").max(50, "Last name is too long."),
    email: emailSchema,
    handle: z.preprocess((value) => (typeof value === "string" ? value.trim().replace(/^@/, "") : value), handleSchema),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date of birth."),
    country: z.string().refine((value) => COUNTRY_CODES.includes(value), "Please select a country."),
    region: z.string().trim().nullish(),
  })
  .superRefine((data, ctx) => {
    if (data.country === "US" && !(US_STATES as readonly string[]).includes(data.region ?? "")) {
      ctx.addIssue({ code: "custom", message: "Please select a state.", path: ["region"] });
    }
  });

export type CreateAiUserResult =
  | { ok: true; user: { id: string; name: string; handle: string } }
  | { ok: false; error: string; status: number };

export async function createAiUser(input: unknown): Promise<CreateAiUserResult> {
  const parsed = aiUserInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details.", status: 400 };
  }

  const { firstName, lastName, handle, country } = parsed.data;
  const email = parsed.data.email.toLowerCase();
  const [year, month, day] = parsed.data.dateOfBirth.split("-").map(Number) as [number, number, number];
  const dateOfBirth = parseDateOfBirth(month, day, year);
  if (dateOfBirth.getMonth() !== month - 1 || dateOfBirth.getDate() !== day) {
    return { ok: false, error: "Please enter a valid date of birth.", status: 400 };
  }
  if (ageInYears(dateOfBirth) < AI_USER_MIN_AGE) {
    return { ok: false, error: `AI users must be at least ${AI_USER_MIN_AGE} years old.`, status: 400 };
  }

  if (await isEmailTaken(email)) {
    return { ok: false, error: "An account with this email already exists.", status: 409 };
  }
  if (await isHandleTaken(handle)) {
    return { ok: false, error: `The handle @${handle} is already taken.`, status: 409 };
  }

  const displayName = `${firstName} ${lastName}`;
  const slug = await uniquePublicSlug(handle, "");

  const user = await prisma.user.create({
    data: {
      email,
      emailVerified: new Date(),
      firstName,
      lastName,
      handle,
      dateOfBirth,
      ageZone: ageZoneToPrisma(resolveAgeZoneFromDateOfBirth(dateOfBirth)),
      country,
      region: country === "US" ? parsed.data.region : null,
      accountType: AccountType.ADULT,
      signupMethod: AI_USER_SIGNUP_METHOD,
      onboardingStep: "complete",
      profile: {
        create: {
          slug,
          displayName,
          handle: `@${handle}`,
          avatarInitials: initialsFromName(displayName),
          avatarColor: pick(AVATAR_COLORS),
          source: AI_USER_SIGNUP_METHOD,
        },
      },
    },
    select: { id: true },
  });

  return { ok: true, user: { id: user.id, name: displayName, handle: `@${handle}` } };
}
