import { query } from './pool.js';

/**
 * Reads seeded Postgres data for a zip and assembles a result shaped like the
 * live API response. Returns null on a complete miss (no market + no indicators).
 * @param {string} zip
 * @returns {Promise<object|null>}
 */
export async function getNeighborhoodFromDb(zip) {
  const [market, econ, rent] = await Promise.all([
    query('SELECT * FROM markets WHERE zip=$1', [zip]),
    query('SELECT * FROM economic_indicators WHERE geo=$1', [zip]),
    query('SELECT * FROM rent_benchmarks WHERE zip=$1 ORDER BY bedroom', [zip]),
  ]);

  if (market.rows.length === 0 && econ.rows.length === 0) return null;

  // Build metric lookup: { metric_name: numeric_value }
  const m = Object.fromEntries(econ.rows.map((r) => [r.metric, Number(r.value)]));

  // Build FMR lookup keyed by bedroom number
  const fmrByBed = Object.fromEntries(rent.rows.map((r) => [Number(r.bedroom), Number(r.fmr)]));

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

  const renterRate = occupied && renter ? (renter / occupied) * 100 : null;
  const vacancyRate = total && vacant ? (vacant / total) * 100 : null;
  const unemploymentRate = laborForce && unemployed ? (unemployed / laborForce) * 100 : null;
  const priceToRentRatio =
    m.median_rent && m.median_home_value ? m.median_home_value / (m.median_rent * 12) : null;

  // Scoring (identical logic to live route so blending in page.jsx works correctly)
  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
  const incomeScore = m.median_income ? clamp((m.median_income - 40000) / 600, 0, 100) : 50;
  const vacancyScore = vacancyRate !== null ? clamp(100 - vacancyRate * 6, 0, 100) : 50;
  const unemploymentScore = unemploymentRate !== null ? clamp(100 - unemploymentRate * 10, 0, 100) : 50;
  const p2rScore = priceToRentRatio !== null ? clamp(100 - (priceToRentRatio - 10) * 3.5, 10, 100) : 50;

  const neighborhoodScore = Math.round(
    incomeScore * 0.35 + vacancyScore * 0.25 + unemploymentScore * 0.2 + p2rScore * 0.2,
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
      medianHomeValue: m.median_home_value || null,
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
    source: 'postgres',
  };
}
