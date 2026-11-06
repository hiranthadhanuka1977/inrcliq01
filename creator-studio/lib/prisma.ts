import path from "node:path";
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client";

const root = path.join(process.cwd(), "..");
config({ path: path.join(root, ".env") });
config({ path: path.join(root, ".env.local"), override: true });

const STUDIO_SCHEMA_VERSION = "20261102172000_studio_audio_duration";

const globalForPrisma = globalThis as unknown as {
  studioPrisma?: PrismaClient;
  studioSchemaVersion?: string;
};

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

function studioClient() {
  if (globalForPrisma.studioSchemaVersion === STUDIO_SCHEMA_VERSION && globalForPrisma.studioPrisma) {
    return globalForPrisma.studioPrisma;
  }
  const client = createClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.studioPrisma = client;
    globalForPrisma.studioSchemaVersion = STUDIO_SCHEMA_VERSION;
  }
  return client;
}

export const prisma = studioClient();
