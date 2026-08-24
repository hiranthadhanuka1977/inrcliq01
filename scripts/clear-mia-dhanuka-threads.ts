import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { prisma } from "../src/lib/prisma";

async function main() {
  const mia = await prisma.creatorUser.findFirst({
    where: { slug: "mia-chen" },
    select: { userId: true, name: true },
  });

  if (!mia?.userId) {
    throw new Error("Mia Chen owner user not found");
  }

  const dhanukaThreads = await prisma.chatThread.findMany({
    where: {
      userId: mia.userId,
      peerName: { contains: "Dhanuka", mode: "insensitive" },
    },
    select: {
      id: true,
      peerName: true,
      peerHandle: true,
      preview: true,
      _count: { select: { messages: true } },
    },
  });

  if (dhanukaThreads.length === 0) {
    console.log("No Dhanuka threads found for Mia Chen.");
    return;
  }

  console.log("Removing threads:");
  console.log(JSON.stringify(dhanukaThreads, null, 2));

  const ids = dhanukaThreads.map((t) => t.id);
  const deleted = await prisma.chatThread.deleteMany({
    where: { id: { in: ids } },
  });

  console.log(`Deleted ${deleted.count} thread(s).`);

  const remaining = await prisma.chatThread.findMany({
    where: { userId: mia.userId },
    select: { peerName: true, peerHandle: true, preview: true, _count: { select: { messages: true } } },
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
  });

  console.log("\nRemaining Mia Chen threads:");
  console.log(JSON.stringify(remaining, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
