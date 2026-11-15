import { prisma } from "@/lib/prisma";

export type DmBlockState = {
  blockedByMe: boolean;
  blockedByThem: boolean;
};

type BlockRow = {
  blockerUserId: string;
  blockedUserId: string;
};

export async function listDmBlocksForUser(userId: string): Promise<BlockRow[]> {
  return prisma.directMessageBlock.findMany({
    where: {
      OR: [{ blockerUserId: userId }, { blockedUserId: userId }],
    },
    select: { blockerUserId: true, blockedUserId: true },
  });
}

export function blockStateForPeer(
  userId: string,
  peerUserId: string | null,
  rows: BlockRow[],
): DmBlockState {
  if (!peerUserId || peerUserId === userId) {
    return { blockedByMe: false, blockedByThem: false };
  }
  return {
    blockedByMe: rows.some(
      (row) => row.blockerUserId === userId && row.blockedUserId === peerUserId,
    ),
    blockedByThem: rows.some(
      (row) => row.blockerUserId === peerUserId && row.blockedUserId === userId,
    ),
  };
}

export async function getDmBlockBetween(userId: string, peerUserId: string): Promise<DmBlockState> {
  const rows = await prisma.directMessageBlock.findMany({
    where: {
      OR: [
        { blockerUserId: userId, blockedUserId: peerUserId },
        { blockerUserId: peerUserId, blockedUserId: userId },
      ],
    },
    select: { blockerUserId: true, blockedUserId: true },
  });
  return blockStateForPeer(userId, peerUserId, rows);
}

export async function setDirectMessageBlock(
  blockerUserId: string,
  blockedUserId: string,
  blocked: boolean,
) {
  if (!blockerUserId || !blockedUserId || blockerUserId === blockedUserId) {
    return false;
  }

  if (blocked) {
    await prisma.directMessageBlock.upsert({
      where: {
        blockerUserId_blockedUserId: { blockerUserId, blockedUserId },
      },
      create: { blockerUserId, blockedUserId },
      update: {},
    });
    return true;
  }

  await prisma.directMessageBlock.deleteMany({
    where: { blockerUserId, blockedUserId },
  });
  return true;
}
