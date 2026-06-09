import {
  upsertEconomicIndicator,
  upsertMarket,
  startRefresh,
  finishRefresh,
} from "../repositories.js";

const ACS5_YEAR = "2022";
const PERIOD = `${ACS5_YEAR}-12-31`;

// Column order matches the GET= string in pullCensus below
// idx: 0=NAME,1=B19013_001E(medianIncome),2=B25064_001E(medianRent),
//      3=B25077_001E(medianHomeValue),4=B01003_001E(population),
//      5=B25003_003E(renterUnits),6=B25002_002E(occupiedUnits),
//      7=B25002_003E(vacantUnits),8=B25002_001E(totalUnits),
//      9=B23025_005E(unemployed),10=B23025_003E(laborForce),11=zip
const FIELDS = [
  { idx: 1, metric: "median_income" },
  { idx: 2, metric: "median_rent" },
  { idx: 3, metric: "median_home_value" },
  { idx: 4, metric: "population" },
  { idx: 5, metric: "renter_units" },
  { idx: 6, metric: "occupied_units" },
  { idx: 7, metric: "vacant_units" },
  { idx: 8, metric: "total_units" },
  { idx: 9, metric: "unemployed" },
  { idx: 10, metric: "labor_force" },
];

/**
 * Pure parser — converts one ACS5 data row into indicator records.
 * Drops negative sentinel values (e.g. -666666666).
 */
export function parseCensusRow(zip, row) {
  const out = [];
  for (const { idx, metric } of FIELDS) {
    const v = Number(row[idx]);
    if (isNaN(v) || v < 0) continue;
    out.push({
      geo: zip,
      metric,
      value: v,
      source: "CENSUS_ACS5",
      period: PERIOD,
    });
  }
  return out;
}

export async function pullCensus(client, zip) {
  const key = process.env.CENSUS_API_KEY;
  const id = await startRefresh(client, "CENSUS_ACS5");
  try {
    const url =
      `https://api.census.gov/data/${ACS5_YEAR}/acs/acs5` +
      `?get=NAME,B19013_001E,B25064_001E,B25077_001E,B01003_001E,` +
      `B25003_003E,B25002_002E,B25002_003E,B25002_001E,B23025_005E,B23025_003E` +
      `&for=zip%20code%20tabulation%20area:${zip}` +
      (key ? `&key=${key}` : "");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Census HTTP ${res.status}`);
    const rows = await res.json();
    if (!rows || rows.length < 2) throw new Error("Census: no data rows");
    const dataRow = rows[1];
    const indicators = parseCensusRow(zip, dataRow);

    // Also upsert a market stub so the zip exists in markets table
    await upsertMarket(client, {
      zip,
      city: dataRow[0],
      state: null,
      stateCode: null,
      countyFips: null,
      lat: null,
      lon: null,
    });

    let n = 0;
    for (const rec of indicators) {
      await upsertEconomicIndicator(client, rec);
      n++;
    }
    await finishRefresh(client, id, { status: "success", rows: n });
    return n;
  } catch (err) {
    await finishRefresh(client, id, {
      status: "error",
      error: String(err.message || err),
    });
    throw err;
  }
}
