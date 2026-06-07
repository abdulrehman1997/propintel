import { upsertEconomicIndicator, startRefresh, finishRefresh } from '../repositories.js';

const SERIES_METRIC_MAP = {
  LNS14000000: 'unemployment_rate',
  CES0000000001: 'nonfarm_payrolls',
};

/**
 * Pure parser — extracts the latest period from BLS JSON response.
 * BLS marks the latest observation with latest: 'true'.
 */
export function parseBlsLatest(seriesId, geo, data) {
  const series = data?.Results?.series?.find((s) => s.seriesID === seriesId);
  if (!series || !series.data || series.data.length === 0) return null;
  // Prefer the entry marked latest; fall back to first entry (most recent by position)
  const latest = series.data.find((d) => d.latest === 'true') || series.data[0];
  if (!latest) return null;
  return {
    geo,
    metric: SERIES_METRIC_MAP[seriesId] || seriesId.toLowerCase(),
    value: Number(latest.value),
    source: 'BLS',
    period: `${latest.year}-${latest.period}`,
  };
}

export async function pullBls(client, seriesId = 'LNS14000000', geo = 'US') {
  const id = await startRefresh(client, 'BLS');
  try {
    const res = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seriesid: [seriesId],
        registrationkey: process.env.BLS_API_KEY,
      }),
    });
    if (!res.ok) throw new Error(`BLS HTTP ${res.status}`);
    const rec = parseBlsLatest(seriesId, geo, await res.json());
    if (!rec) throw new Error('BLS: no data');
    await upsertEconomicIndicator(client, rec);
    await finishRefresh(client, id, { status: 'success', rows: 1 });
    return 1;
  } catch (err) {
    await finishRefresh(client, id, { status: 'error', error: String(err.message || err) });
    throw err;
  }
}
