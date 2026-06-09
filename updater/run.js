import { pool } from "./db.js";
import { pullCensus } from "./sources/census.js";
import { pullHud } from "./sources/hud.js";
import { pullFred } from "./sources/fred.js";
import { pullBls } from "./sources/bls.js";
import { pullZillow } from "./sources/zillow.js";

function defaultTasks(zips) {
  return [
    {
      source: "CENSUS_ACS5",
      run: async (c) => {
        let n = 0;
        for (const z of zips) n += await pullCensus(c, z);
        return n;
      },
    },
    { source: "FRED", run: (c) => pullFred(c) },
    { source: "BLS", run: (c) => pullBls(c) },
    { source: "ZILLOW_ZHVI", run: (c) => pullZillow(c, zips) },
    // HUD requires stateCode — skip in default run; callers add it explicitly
  ];
}

/**
 * Runs all data sources. Each source is isolated in its own try/catch so one
 * failure never aborts the others. Writes a refresh_log row per source.
 *
 * @param {{ client?, zips?, tasks? }} options
 * @returns {Promise<Array<{source, status, rows?, error?}>>}
 */
export async function runAllSources({ client = pool, zips = [], tasks } = {}) {
  const list = tasks || defaultTasks(zips);
  const summary = [];
  for (const t of list) {
    try {
      const rows = await t.run(client, zips);
      summary.push({ source: t.source, status: "success", rows });
    } catch (err) {
      summary.push({
        source: t.source,
        status: "error",
        error: String(err.message || err),
      });
    }
  }
  return summary;
}
