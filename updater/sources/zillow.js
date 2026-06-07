import { parse } from 'csv-parse/sync';
import { upsertEconomicIndicator, startRefresh, finishRefresh } from '../repositories.js';

// Zillow ZHVI All Homes (SFR, Condo/Co-op), Time Series, Smoothed, Seasonally Adjusted — zip level
const ZILLOW_CSV_URL =
  'https://files.zillowstatic.com/research/public_csvs/zhvi/Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Pure parser — picks the latest date column and extracts ZHVI for requested zips.
 */
export function parseZillowCsv(csvText, zips) {
  const records = parse(csvText, { columns: true, skip_empty_lines: true });
  if (records.length === 0) return [];
  const cols = Object.keys(records[0]);
  const dateCols = cols.filter((c) => DATE_RE.test(c));
  if (dateCols.length === 0) return [];
  const latest = dateCols[dateCols.length - 1];
  const wanted = new Set(zips);
  const out = [];
  for (const row of records) {
    if (!wanted.has(row.RegionName)) continue;
    const v = row[latest];
    if (v === '' || v == null) continue;
    out.push({
      geo: row.RegionName,
      metric: 'zhvi',
      value: Number(v),
      source: 'ZILLOW_ZHVI',
      period: latest,
    });
  }
  return out;
}

export async function pullZillow(client, zips = []) {
  const id = await startRefresh(client, 'ZILLOW_ZHVI');
  try {
    const res = await fetch(ZILLOW_CSV_URL);
    if (!res.ok) throw new Error(`Zillow CSV HTTP ${res.status}`);
    const csvText = await res.text();
    const records = parseZillowCsv(csvText, zips);
    for (const rec of records) {
      await upsertEconomicIndicator(client, rec);
    }
    await finishRefresh(client, id, { status: 'success', rows: records.length });
    return records.length;
  } catch (err) {
    await finishRefresh(client, id, { status: 'error', error: String(err.message || err) });
    throw err;
  }
}
