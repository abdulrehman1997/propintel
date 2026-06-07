import { upsertEconomicIndicator, startRefresh, finishRefresh } from '../repositories.js';

// Map FRED series IDs to human-readable metric names
const SERIES_METRIC_MAP = {
  MORTGAGE30US: 'mortgage_rate_30y',
  FEDFUNDS: 'fed_funds_rate',
  CPIAUCSL: 'cpi',
  UNRATE: 'unemployment_rate_national',
};

/**
 * Pure parser — finds the latest non-missing FRED observation.
 * FRED uses '.' for missing values.
 */
export function parseFredLatest(seriesId, geo, data) {
  const observations = (data.observations || []).filter((o) => o.value !== '.');
  if (observations.length === 0) return null;
  // Observations are ordered oldest→newest; take the last valid one
  const latest = observations[observations.length - 1];
  return {
    geo,
    metric: SERIES_METRIC_MAP[seriesId] || seriesId.toLowerCase(),
    value: Number(latest.value),
    source: 'FRED',
    period: latest.date,
  };
}

export async function pullFred(client, seriesId = 'MORTGAGE30US', geo = 'US') {
  const key = process.env.FRED_API_KEY;
  if (!key) throw new Error('FRED_API_KEY not set');
  const id = await startRefresh(client, 'FRED');
  try {
    const url =
      `https://api.stlouisfed.org/fred/series/observations` +
      `?series_id=${seriesId}&api_key=${key}&file_type=json&sort_order=asc&limit=10&sort_order=desc`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`FRED HTTP ${res.status}`);
    const rec = parseFredLatest(seriesId, geo, await res.json());
    if (!rec) throw new Error('FRED: no data');
    await upsertEconomicIndicator(client, rec);
    await finishRefresh(client, id, { status: 'success', rows: 1 });
    return 1;
  } catch (err) {
    await finishRefresh(client, id, { status: 'error', error: String(err.message || err) });
    throw err;
  }
}
