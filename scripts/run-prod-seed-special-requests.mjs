/**
 * Seed Mia Chen SpecialRequestCatalog on production via admin API.
 *
 * Usage:
 *   node scripts/run-prod-seed-special-requests.mjs
 */
const URL =
  process.env.SEED_SPECIAL_REQUESTS_URL ||
  "https://inrcliq01.vercel.app/api/admin/seed-special-requests";
const SECRET = process.env.FULL_SYNC_SECRET || "inrcliq-full-sync-20260728";

async function main() {
  const basic = Buffer.from("demo@inrcliq.com:demo@inrcliq.com").toString("base64");
  const response = await fetch(URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "x-full-sync-secret": SECRET,
    },
  });

  const data = await response.json().catch(() => ({}));
  console.log(`Status: ${response.status}`);
  console.log(JSON.stringify(data, null, 2));

  if (!response.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
