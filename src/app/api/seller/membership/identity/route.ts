import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;

    if (user.guardianIdentityStatus === "rejected") {
      return NextResponse.json(
        { error: "Identity verification was rejected. You cannot subscribe until it is accepted." },
        { status: 403 },
      );
    }

    if (user.guardianIdentityStatus !== "accepted" && user.guardianIdentityStatus !== "submitted") {
      await prisma.user.update({
        where: { id: user.id },
        data: { guardianIdentityStatus: "submitted" },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/seller/membership/identity error", err);
    return NextResponse.json({ error: "Unable to save age verification." }, { status: 500 });
  }
}
