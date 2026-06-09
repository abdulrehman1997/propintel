import "dotenv/config";
import cron from "node-cron";
import { runSchema } from "./db.js";
import { runAllSources } from "./run.js";

const SCHEDULE = process.env.CRON_SCHEDULE || "0 3 * * *";
const SEED_ZIPS = (process.env.SEED_ZIPS || "17101,17102,19103,15213")
  .split(",")
  .map((z) => z.trim());

async function tick() {
  try {
    const summary = await runAllSources({ zips: SEED_ZIPS });
    // eslint-disable-next-line no-console
    console.log(new Date().toISOString(), "refresh:", JSON.stringify(summary));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(new Date().toISOString(), "refresh error:", err);
  }
}

await runSchema();
cron.schedule(SCHEDULE, tick);
// eslint-disable-next-line no-console
console.log(`Updater scheduled: ${SCHEDULE} for zips ${SEED_ZIPS.join(",")}`);
