import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import pg from "pg";

/**
 * Prefer Neon's unpooled URL for migrate (advisory locks are unreliable on pooled
 * connections). Retry transient lock/timeout failures common during Vercel deploys.
 *
 * If the schema already has application tables but no `_prisma_migrations` history
 * (e.g. after a manual restore), baseline all local migrations so deploy can proceed
 * without wiping data.
 */
function resolveMigrateDatabaseUrl() {
  return (
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    ""
  );
}

function runCommand(command, args, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      const text = String(chunk);
      stdout += text;
      process.stdout.write(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = String(chunk);
      stderr += text;
      process.stderr.write(text);
    });
    child.on("exit", (code, signal) => {
      resolve({ code: signal ? 1 : (code ?? 1), stdout, stderr });
    });
  });
}

function migrationNames() {
  const root = join(process.cwd(), "prisma", "migrations");
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function baselineIfNeeded(databaseUrl, env) {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost") ? undefined : { rejectUnauthorized: false },
    max: 1,
  });
  const client = await pool.connect();
  try {
    const history = await client.query(
      `SELECT to_regclass('public._prisma_migrations') AS table_name`,
    );
    if (history.rows[0]?.table_name) {
      return false;
    }

    const tables = await client.query(`
      SELECT COUNT(*)::int AS count
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    if ((tables.rows[0]?.count ?? 0) === 0) {
      return false;
    }

    console.warn(
      "[migrate] Non-empty schema without _prisma_migrations detected; baselining existing migrations.",
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS public."_prisma_migrations" (
        "id" VARCHAR(36) PRIMARY KEY,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      )
    `);
  } finally {
    client.release();
    await pool.end();
  }

  for (const name of migrationNames()) {
    console.log(`[migrate] resolve --applied ${name}`);
    const result = await runCommand("npx", ["prisma", "migrate", "resolve", "--applied", name], env);
    if (result.code !== 0) {
      throw new Error(`Failed to baseline migration ${name}`);
    }
  }

  return true;
}

const attempts = Number(process.env.PRISMA_MIGRATE_RETRIES ?? "4");
const baseDelayMs = Number(process.env.PRISMA_MIGRATE_RETRY_DELAY_MS ?? "5000");
const databaseUrl = resolveMigrateDatabaseUrl();

if (!databaseUrl) {
  console.error("[migrate] DATABASE_URL (or unpooled equivalent) is not set.");
  process.exit(1);
}

const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
};

if (
  process.env.DATABASE_URL_UNPOOLED?.trim() ||
  process.env.POSTGRES_URL_NON_POOLING?.trim()
) {
  console.log("[migrate] Using unpooled database URL for migrate deploy");
}

try {
  await baselineIfNeeded(databaseUrl, env);
} catch (error) {
  console.error("[migrate] Baseline failed:", error instanceof Error ? error.message : error);
  process.exit(1);
}

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  console.log(`[migrate] prisma migrate deploy (attempt ${attempt}/${attempts})`);
  const result = await runCommand("npx", ["prisma", "migrate", "deploy"], env);

  if (result.code === 0) {
    process.exit(0);
  }

  const combined = `${result.stdout}\n${result.stderr}`;
  if (combined.includes("P3005")) {
    try {
      const baselined = await baselineIfNeeded(databaseUrl, env);
      if (baselined) {
        console.log("[migrate] Retrying migrate deploy after baseline");
        const retry = await runCommand("npx", ["prisma", "migrate", "deploy"], env);
        process.exit(retry.code);
      }
    } catch (error) {
      console.error("[migrate] Baseline after P3005 failed:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  if (attempt === attempts) {
    console.error("[migrate] All migrate deploy attempts failed.");
    process.exit(result.code);
  }

  const waitMs = baseDelayMs * attempt;
  console.warn(`[migrate] Attempt failed; retrying in ${waitMs}ms...`);
  await delay(waitMs);
}
