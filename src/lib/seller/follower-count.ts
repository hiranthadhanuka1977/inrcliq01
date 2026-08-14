import { prisma } from "@/lib/prisma";

/** Inbound follower count for the logged-in creator, if they have a CreatorUser. */
export async function countInboundFollowersForUser(userId: string): Promise<number> {
  const creator = await prisma.creatorUser.findFirst({
    where: { userId },
    select: { id: true },
  });
  if (!creator) return 0;
  return prisma.creatorFollow.count({ where: { creatorId: creator.id } });
}
