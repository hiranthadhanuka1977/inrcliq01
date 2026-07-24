import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

/**
 * Prefer Neon's unpooled URL for migrate (advisory locks are unreliable on pooled
 * connections). Retry transient lock/timeout failures common during Vercel deploys.
 */
function resolveMigrateDatabaseUrl() {
  return (
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    ""
  );
}

function runMigrateDeploy(env) {
  return new Promise((resolve) => {
    const child = spawn("npx", ["prisma", "migrate", "deploy"], {
      env,
      stdio: "inherit",
      shell: true,
    });
    child.on("exit", (code, signal) => {
      if (signal) {
        resolve(1);
        return;
      }
      resolve(code ?? 1);
    });
  });
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

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  console.log(`[migrate] prisma migrate deploy (attempt ${attempt}/${attempts})`);
  const status = await runMigrateDeploy(env);

  if (status === 0) {
    process.exit(0);
  }

  if (attempt === attempts) {
    console.error("[migrate] All migrate deploy attempts failed.");
    process.exit(status);
  }

  const waitMs = baseDelayMs * attempt;
  console.warn(`[migrate] Attempt failed; retrying in ${waitMs}ms...`);
  await delay(waitMs);
}
