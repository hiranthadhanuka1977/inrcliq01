/**
 * Write every account marked as a demo user (`signupMethod` "demo-seed") to data/demo-users.json,
 * the file the seed sample settings page deletes and restores. Passwords are never written.
 * Usage: npm run db:snapshot-demo-users
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/lib/prisma";
import { DEMO_USERS_FILE, snapshotDemoUsers } from "../src/lib/settings/demo-users";

async function main() {
  const snapshot = await snapshotDemoUsers();
  writeFileSync(join(process.cwd(), "data", DEMO_USERS_FILE), `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(
    `Wrote ${snapshot.users.length} demo users and ${snapshot.guardianLinks.length} parent-child links to data/${DEMO_USERS_FILE}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
