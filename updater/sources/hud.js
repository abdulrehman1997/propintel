import { upsertRentBenchmark, startRefresh, finishRefresh } from '../repositories.js';

/**
 * Pure parser — converts HUD basicdata array into rent_benchmark records.
 * Prefers the zip-level SAFMR row; falls back to MSA-level row.
 */
export function parseHudBasicData(zip, basicdata, year) {
  const zipRow = basicdata.find((r) => r.zip_code === zip);
  const msaRow = basicdata.find((r) => r.zip_code === 'MSA level');
  const source = zipRow || msaRow;
  if (!source) return [];

  return [
    { bedroom: 0, fmr: source['Efficiency'] },
    { bedroom: 1, fmr: source['One-Bedroom'] },
    { bedroom: 2, fmr: source['Two-Bedroom'] },
    { bedroom: 3, fmr: source['Three-Bedroom'] },
    { bedroom: 4, fmr: source['Four-Bedroom'] },
  ]
    .filter((r) => r.fmr != null)
    .map((r) => ({ zip, bedroom: r.bedroom, fmr: r.fmr, source: 'HUD_FMR', period: String(year) }));
}

export async function pullHud(client, stateCode, zip) {
  const token = process.env.HUD_API_TOKEN;
  if (!token) throw new Error('HUD_API_TOKEN not set');
  const id = await startRefresh(client, 'HUD_FMR');
  try {
    // Step 1: find county entity ID for the state
    const countiesRes = await fetch(
      `https://www.huduser.gov/hudapi/public/fmr/listCounties/${stateCode}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!countiesRes.ok) throw new Error(`HUD listCounties HTTP ${countiesRes.status}`);
    const counties = await countiesRes.json();
    // Use first county as a representative entity (SAFMR includes zip-level breakdown)
    if (!counties || counties.length === 0) throw new Error('HUD: no counties returned');
    const entityId = counties[0].fips_code;

    // Step 2: fetch FMR data for entity
    const fmrRes = await fetch(
      `https://www.huduser.gov/hudapi/public/fmr/data/${entityId}?year=2025`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!fmrRes.ok) throw new Error(`HUD FMR HTTP ${fmrRes.status}`);
    const hudJson = await fmrRes.json();
    const basicdata = hudJson.data?.basicdata;
    if (!basicdata) throw new Error('HUD: no basicdata');

    const records = parseHudBasicData(zip, basicdata, '2025');
    for (const rec of records) {
      await upsertRentBenchmark(client, rec);
    }
    await finishRefresh(client, id, { status: 'success', rows: records.length });
    return records.length;
  } catch (err) {
    await finishRefresh(client, id, { status: 'error', error: String(err.message || err) });
    throw err;
  }
}
