import { query } from "./pool.js";

/**
 * Reads seeded Postgres data for a zip and assembles a result shaped like the
 * live API response. Returns null on a complete miss (no market + no indicators).
 * @param {string} zip
 * @returns {Promise<object|null>}
 */
export async function getNeighborhoodFromDb(zip) {
  // The unemployment_rate from BLS is seeded at the national geo ('US'), not
  // per-ZIP, so fetch it alongside the per-ZIP indicators as a fallback.
  const [market, econ, natl, rent] = await Promise.all([
    query("SELECT * FROM markets WHERE zip=$1", [zip]),
    query("SELECT * FROM economic_indicators WHERE geo=$1", [zip]),
    query("SELECT * FROM economic_indicators WHERE geo='US'", []),
    query("SELECT * FROM rent_benchmarks WHERE zip=$1 ORDER BY bedroom", [zip]),
  ]);

  if (market.rows.length === 0 && econ.rows.length === 0) return null;

  // Build metric lookup: { metric_name: numeric_value }
  const m = Object.fromEntries(
    econ.rows.map((r) => [r.metric, Number(r.value)]),
  );
  const natlMetrics = Object.fromEntries(
    natl.rows.map((r) => [r.metric, Number(r.value)]),
  );

  // Build FMR lookup keyed by bedroom number
  const fmrByBed = Object.fromEntries(
    rent.rows.map((r) => [Number(r.bedroom), Number(r.fmr)]),
  );

  // Determine staleness timestamp from most recently updated row
  const dataAsOf =
    [...econ.rows, ...market.rows]
      .map((r) => r.updated_at || r.last_refreshed)
      .filter(Boolean)
      .sort()
      .pop() || null;

  // Derived census metrics — mirror what the live route computes
  const occupied = m.occupied_units || null;
  const total = m.total_units || null;
  const renter = m.renter_units || null;
  const vacant = m.vacant_units || null;
  const unemployed = m.unemployed || null;
  const laborForce = m.labor_force || null;

  // Median home value: prefer Census median_home_value, fall back to the seeded
  // Zillow ZHVI metric (the value actually present per-ZIP for seeded markets).
  const medianHomeValue = m.median_home_value || m.zhvi || null;

  const renterRate = occupied && renter ? (renter / occupied) * 100 : null;
  const vacancyRate = total && vacant ? (vacant / total) * 100 : null;
  // Unemployment rate: prefer a directly-seeded rate (per-ZIP, else national 'US'
  // from BLS); fall back to the derived unemployed/labor_force ratio if present.
  const unemploymentRate =
    m.unemployment_rate ??
    natlMetrics.unemployment_rate ??
    (laborForce && unemployed ? (unemployed / laborForce) * 100 : null);
  const priceToRentRatio =
    m.median_rent && medianHomeValue
      ? medianHomeValue / (m.median_rent * 12)
      : null;

  // Scoring (identical logic to live route so blending in page.jsx works correctly)
  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
  const incomeScore = m.median_income
    ? clamp((m.median_income - 40000) / 600, 0, 100)
    : 50;
  const vacancyScore =
    vacancyRate !== null ? clamp(100 - vacancyRate * 6, 0, 100) : 50;
  const unemploymentScore =
    unemploymentRate !== null ? clamp(100 - unemploymentRate * 10, 0, 100) : 50;
  const p2rScore =
    priceToRentRatio !== null
      ? clamp(100 - (priceToRentRatio - 10) * 3.5, 10, 100)
      : 50;

  const neighborhoodScore = Math.round(
    incomeScore * 0.35 +
      vacancyScore * 0.25 +
      unemploymentScore * 0.2 +
      p2rScore * 0.2,
  );

  const mk = market.rows[0] || {};

  return {
    location: {
      city: mk.city || zip,
      state: mk.state || null,
      zip,
      stateCode: mk.state_code || null,
    },
    census: {
      medianIncome: m.median_income || null,
      medianRent: m.median_rent || null,
      medianHomeValue,
      population: m.population || null,
      renterUnits: renter,
      occupiedUnits: occupied,
      vacantUnits: vacant,
      totalUnits: total,
      unemployed,
      laborForce,
      renterRate,
      vacancyRate,
      unemploymentRate,
      priceToRentRatio,
    },
    fmr: {
      studio: fmrByBed[0] || null,
      oneBed: fmrByBed[1] || null,
      twoBed: fmrByBed[2] || null,
      threeBed: fmrByBed[3] || null,
      fourBed: fmrByBed[4] || null,
      isSafmr: rent.rows.some((r) => Number(r.bedroom) >= 0),
    },
    neighborhoodScore,
    scoreBreakdown: {
      incomeScore,
      vacancyScore,
      unemploymentScore,
      priceToRentScore: p2rScore,
    },
    dataAsOf,
    source: "postgres",
  };
}
