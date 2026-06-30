import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { AccountType } from "@/generated/prisma/client";
import {
  createEmailVerificationToken,
  sendVerificationEmail,
} from "@/lib/auth/email-verification";
import type { User } from "@/generated/prisma/client";
import { getPostVerifyOnboardingStep, getPostVerifyRedirect } from "@/lib/auth/onboarding";
import { calculateAge, parseDateOfBirth } from "@/lib/utils/age";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { parseSignupJoin } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = parseSignupJoin(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid signup details." },
        { status: 400 },
      );
    }

    const { firstName, lastName, email, oauthProvider, month, day, year, country, region } = parsed.data;
    const isOAuthSignup = oauthProvider === "google" || oauthProvider === "apple";

    if (country === "US" && !region?.trim()) {
      return NextResponse.json({ error: "Please select your state." }, { status: 400 });
    }

    const dateOfBirth = parseDateOfBirth(month, day, year);
    if (Number.isNaN(dateOfBirth.getTime())) {
      return NextResponse.json({ error: "Please enter a valid date of birth." }, { status: 400 });
    }

    const age = calculateAge(month, day, year);
    const accountType = age < 18 ? AccountType.MINOR : AccountType.ADULT;
    const normalizedEmail = isOAuthSignup
      ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}+${oauthProvider}.${randomBytes(4).toString("hex")}@prototype.inrcliq.local`
      : email!.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (existing?.emailVerified) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please log in." },
        { status: 409 },
      );
    }

    if (isOAuthSignup) {
      const onboardingStep = getPostVerifyOnboardingStep({ accountType } as User);
      const user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          firstName,
          lastName,
          dateOfBirth,
          country,
          region: country === "US" ? region : null,
          accountType,
          signupMethod: oauthProvider,
          emailVerified: new Date(),
          onboardingStep,
        },
      });

      await createSession(user.id);

      return NextResponse.json({
        ok: true,
        skipVerification: true,
        redirectTo: getPostVerifyRedirect({
          ...user,
          emailVerified: new Date(),
          accountType: user.accountType,
        }),
      });
    }

    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: {
            firstName,
            lastName,
            dateOfBirth,
            country,
            region: country === "US" ? region : null,
            accountType,
            signupMethod: "email",
            onboardingStep: null,
          },
        })
      : await prisma.user.create({
          data: {
            email: normalizedEmail,
            firstName,
            lastName,
            dateOfBirth,
            country,
            region: country === "US" ? region : null,
            accountType,
            signupMethod: "email",
          },
        });

    const tokenResult = await createEmailVerificationToken(normalizedEmail);

    if (!tokenResult.ok) {
      return NextResponse.json(
        {
          ok: true,
          email: normalizedEmail,
          accountType,
          cooldownRemaining: tokenResult.cooldownRemaining,
        },
        { status: 200 },
      );
    }

    await sendVerificationEmail(normalizedEmail, tokenResult.verifyUrl);

    return NextResponse.json({
      ok: true,
      email: normalizedEmail,
      accountType,
      userId: user.id,
      cooldownRemaining: tokenResult.cooldownRemaining,
      verifyUrl: tokenResult.verifyUrl,
    });
  } catch (error) {
    console.error("signup/join error", error);
    return NextResponse.json({ error: "Unable to complete signup." }, { status: 500 });
  }
}
