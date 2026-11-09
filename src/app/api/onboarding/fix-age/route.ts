import { NextResponse } from "next/server";
import { AccountType, ApprovalStatus } from "@/generated/prisma/client";
import { requireSessionUser } from "@/lib/api-helpers";
import { ageZoneWriteData } from "@/lib/guardian/user-age-zone";
import { calculateAge, dateOfBirthError, parseDateOfBirth } from "@/lib/utils/age";
import { prisma } from "@/lib/prisma";

function parseDobPart(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed)) return parsed;
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;

    if (user.accountType !== AccountType.MINOR) {
      return NextResponse.json({ error: "Only minor accounts can update age status." }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const month = parseDobPart(body?.month);
    const day = parseDobPart(body?.day);
    const year = parseDobPart(body?.year);

    if (month == null || day == null || year == null) {
      return NextResponse.json({ error: "Please enter your full date of birth." }, { status: 400 });
    }

    const dobMessage = dateOfBirthError(month, day, year);
    if (dobMessage) {
      return NextResponse.json({ error: dobMessage }, { status: 400 });
    }

    const dateOfBirth = parseDateOfBirth(month, day, year);

    const age = calculateAge(month, day, year);
    if (age < 18) {
      return NextResponse.json(
        { error: "To continue as an adult, your date of birth must show you are 18 or older." },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.parentApprovalRequest.updateMany({
        where: { childUserId: user.id, status: ApprovalStatus.PENDING },
        data: { status: ApprovalStatus.EXPIRED, resolvedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          dateOfBirth,
          accountType: AccountType.ADULT,
          onboardingStep: "password",
          ...ageZoneWriteData(dateOfBirth),
        },
      }),
    ]);

    return NextResponse.json({ ok: true, redirectTo: "/onboarding/password" });
  } catch (error) {
    console.error("onboarding/fix-age error", error);
    return NextResponse.json({ error: "Unable to update account." }, { status: 500 });
  }
}
