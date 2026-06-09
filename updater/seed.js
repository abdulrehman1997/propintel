import "dotenv/config";
import { pool, runSchema } from "./db.js";
import { runAllSources } from "./run.js";
import { importListings } from "./listings.js";
import { importZillow } from "./zillow.js";

const SEED_ZIPS = (process.env.SEED_ZIPS || "17101,17102,19103,15213")
  .split(",")
  .map((z) => z.trim());

async function main() {
  await runSchema();
  const summary = await runAllSources({ zips: SEED_ZIPS });
  // eslint-disable-next-line no-console
  console.log("Seed complete:", JSON.stringify(summary));
  try {
    await importListings();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("listings import failed (non-fatal):", err.message);
  }
  try {
    // Live Zillow pull (photos + rent estimates); self-skips if RAPIDAPI_KEY unset.
    await importZillow();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("zillow import failed (non-fatal):", err.message);
  }
  await pool.end();
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error("Seed failed:", err);
  await pool.end();
  process.exit(1);
});
