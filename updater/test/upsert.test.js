import { describe, it, expect, beforeEach } from 'vitest';
import { newDb } from 'pg-mem';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  upsertMarket,
  upsertRentBenchmark,
  upsertEconomicIndicator,
  startRefresh,
  finishRefresh,
} from '../repositories.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function makeDb() {
  const db = newDb();
  db.public.none(readFileSync(join(__dirname, '../schema.sql'), 'utf8'));
  const { Pool } = db.adapters.createPg();
  return new Pool();
}

describe('idempotent upserts', () => {
  let client;
  beforeEach(() => {
    client = makeDb();
  });

  it('upsertMarket inserts then updates without duplicating', async () => {
    await upsertMarket(client, { zip: '17101', city: 'Harrisburg', state: 'Pennsylvania', stateCode: 'PA', countyFips: '42043', lat: 40.26, lon: -76.88 });
    await upsertMarket(client, { zip: '17101', city: 'Harrisburg City', state: 'Pennsylvania', stateCode: 'PA', countyFips: '42043', lat: 40.26, lon: -76.88 });
    const { rows } = await client.query('SELECT zip, city FROM markets');
    expect(rows).toHaveLength(1);
    expect(rows[0].city).toBe('Harrisburg City');
  });

  it('upsertRentBenchmark is keyed on (zip, bedroom, source, period)', async () => {
    await upsertRentBenchmark(client, { zip: '17101', bedroom: 2, fmr: 1100, source: 'HUD_FMR', period: '2025' });
    await upsertRentBenchmark(client, { zip: '17101', bedroom: 2, fmr: 1200, source: 'HUD_FMR', period: '2025' });
    const { rows } = await client.query('SELECT fmr FROM rent_benchmarks WHERE zip=$1 AND bedroom=2', ['17101']);
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].fmr)).toBe(1200);
  });

  it('upsertEconomicIndicator is keyed on (geo, metric, source, period)', async () => {
    await upsertEconomicIndicator(client, { geo: '17101', metric: 'median_income', value: 50000, source: 'CENSUS_ACS5', period: '2022-12-31' });
    await upsertEconomicIndicator(client, { geo: '17101', metric: 'median_income', value: 55000, source: 'CENSUS_ACS5', period: '2022-12-31' });
    const { rows } = await client.query("SELECT value FROM economic_indicators WHERE geo=$1 AND metric='median_income'", ['17101']);
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].value)).toBe(55000);
  });

  it('startRefresh + finishRefresh write a refresh_log row', async () => {
    const id = await startRefresh(client, 'CENSUS_ACS5');
    expect(typeof id).toBe('number');
    await finishRefresh(client, id, { status: 'success', rows: 5 });
    const { rows } = await client.query('SELECT * FROM refresh_log WHERE id=$1', [id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('success');
    expect(rows[0].rows_upserted).toBe(5);
    expect(rows[0].finished_at).not.toBeNull();
  });

  it('finishRefresh records error message on failure', async () => {
    const id = await startRefresh(client, 'FRED');
    await finishRefresh(client, id, { status: 'error', error: 'timeout' });
    const { rows } = await client.query('SELECT * FROM refresh_log WHERE id=$1', [id]);
    expect(rows[0].status).toBe('error');
    expect(rows[0].error_msg).toBe('timeout');
  });
});
