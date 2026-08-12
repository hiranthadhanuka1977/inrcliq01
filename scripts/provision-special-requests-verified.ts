/**
 * Provision blank SpecialRequestCatalog rows for all verified creators.
 * Usage: npx tsx scripts/provision-special-requests-verified.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { prisma } from "../src/lib/prisma";
import { provisionSpecialRequestCatalogsForVerifiedUsers } from "../src/lib/seller/service-requests-store";

async function main() {
  const result = await provisionSpecialRequestCatalogsForVerifiedUsers();
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
