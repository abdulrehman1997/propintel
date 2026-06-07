/**
 * Idempotent upsert functions for all four tables.
 * Each uses ON CONFLICT ... DO UPDATE so re-running is safe.
 */

export async function upsertMarket(client, { zip, city, state, stateCode, countyFips, lat, lon }) {
  await client.query(
    `INSERT INTO markets (zip, city, state, state_code, county_fips, lat, lon, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())
     ON CONFLICT (zip) DO UPDATE SET
       city         = EXCLUDED.city,
       state        = EXCLUDED.state,
       state_code   = EXCLUDED.state_code,
       county_fips  = EXCLUDED.county_fips,
       lat          = EXCLUDED.lat,
       lon          = EXCLUDED.lon,
       updated_at   = now()`,
    [zip, city, state, stateCode, countyFips ?? null, lat ?? null, lon ?? null],
  );
}

export async function upsertRentBenchmark(client, { zip, bedroom, fmr, source, period }) {
  await client.query(
    `INSERT INTO rent_benchmarks (zip, bedroom, fmr, source, period, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (zip, bedroom, source, period) DO UPDATE SET
       fmr        = EXCLUDED.fmr,
       updated_at = now()`,
    [zip, bedroom, fmr, source, period],
  );
}

export async function upsertEconomicIndicator(client, { geo, metric, value, source, period }) {
  await client.query(
    `INSERT INTO economic_indicators (geo, metric, value, source, period, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (geo, metric, source, period) DO UPDATE SET
       value      = EXCLUDED.value,
       updated_at = now()`,
    [geo, metric, value, source, period],
  );
}

export async function startRefresh(client, source) {
  const { rows } = await client.query(
    `INSERT INTO refresh_log (source, started_at) VALUES ($1, now()) RETURNING id`,
    [source],
  );
  return rows[0].id;
}

export async function finishRefresh(client, id, { status, rows = null, error = null }) {
  await client.query(
    `UPDATE refresh_log
     SET finished_at = now(), status = $2, rows_upserted = $3, error_msg = $4
     WHERE id = $1`,
    [id, status, rows ?? null, error ?? null],
  );
}
