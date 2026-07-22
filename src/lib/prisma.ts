import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaVersion: string | undefined;
};

/** Bump whenever Prisma models change so the Next.js global singleton is discarded. */
const PRISMA_SCHEMA_VERSION = "20260721124500_chat_thread_seed_key";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

function hasRequiredModels(client: PrismaClient | undefined): client is PrismaClient {
  return Boolean(
    client &&
      typeof client.feedPost?.findMany === "function" &&
      typeof client.creatorCollection?.findUnique === "function" &&
      typeof client.collectionProduct?.findMany === "function" &&
      typeof client.chatThread?.findMany === "function" &&
      typeof client.chatMessage?.findMany === "function" &&
      typeof client.creatorSubscription?.findUnique === "function",
  );
}

export function getPrisma(): PrismaClient {
  const cached = globalForPrisma.prisma;
  const versionOk = globalForPrisma.prismaSchemaVersion === PRISMA_SCHEMA_VERSION;

  if (versionOk && hasRequiredModels(cached)) {
    return cached;
  }

  const client = createPrismaClient();

  if (!hasRequiredModels(client)) {
    throw new Error(
      "Prisma client is missing subscription models. Run `npx prisma generate` and restart the Next.js dev server.",
    );
  }

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
    globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;
  }

  return client;
}

/** Lazy proxy so HMR never keeps a stale client without new model delegates. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
