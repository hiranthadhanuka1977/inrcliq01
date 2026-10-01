import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { createAiUser, generateAiUserDraft } from "@/lib/settings/ai-users";

/** A fresh random identity to prefill the Add AI user form. */
export async function GET() {
  try {
    return NextResponse.json(await generateAiUserDraft());
  } catch (err) {
    console.error("settings/ai-users GET error", err);
    return NextResponse.json({ error: "Unable to generate an AI user." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const result = await createAiUser(body);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ user: result.user }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "That email or handle was just taken. Generate new details." }, { status: 409 });
    }
    console.error("settings/ai-users POST error", err);
    return NextResponse.json({ error: "Unable to create the AI user." }, { status: 500 });
  }
}
