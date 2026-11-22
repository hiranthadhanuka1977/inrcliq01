import { prisma } from "@/lib/prisma";

/** ID and selfie already captured, from profile completion, seller membership, or guardian approval. */
export function hasCompletedAdultIdentity(status: string | null | undefined) {
  return status === "accepted" || status === "submitted";
}

export async function submitAdultIdentity(user: {
  id: string;
  guardianIdentityStatus: string | null;
}) {
  if (user.guardianIdentityStatus === "rejected") {
    return {
      ok: false as const,
      status: 403,
      error: "Identity verification was rejected. You cannot continue until it is accepted.",
    };
  }

  if (user.guardianIdentityStatus !== "accepted" && user.guardianIdentityStatus !== "submitted") {
    await prisma.user.update({
      where: { id: user.id },
      data: { guardianIdentityStatus: "submitted" },
    });
  }

  return { ok: true as const };
}
