import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const outDir = join(process.cwd(), "data", "db-export");
mkdirSync(outDir, { recursive: true });

const { rows } = await pool.query(`SELECT * FROM "SpecialRequestCatalog" ORDER BY "updatedAt" ASC`);
writeFileSync(join(outDir, "SpecialRequestCatalog.json"), JSON.stringify(rows, null, 2));

console.log(`Exported ${rows.length} SpecialRequestCatalog row(s) to data/db-export/SpecialRequestCatalog.json`);

await pool.end();
