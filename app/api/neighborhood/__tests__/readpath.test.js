/**
 * Read-path integration test for getNeighborhoodFromDb.
 *
 * These tests require a live Dockerized Postgres instance:
 *   docker compose up -d db
 *   cd updater && node -e "import('./db.js').then(m=>m.runSchema().then(()=>m.pool.end()))"
 *
 * Run with: DATABASE_URL=postgres://propintel:propintel@localhost:5432/propintel npx vitest run app/api/neighborhood/__tests__
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";

// Guard: skip entire suite when no DATABASE_URL is set or Docker is unreachable
const hasDocker = !!process.env.DATABASE_URL;

describe.skipIf(!hasDocker)("getNeighborhoodFromDb (real Postgres)", () => {
  // Dynamic imports inside the suite body so non-Docker environments
  // never try to open a pg connection at module load time.
  let getPool, getNeighborhoodFromDb;
  const ZIP = "99001"; // throwaway test zip

  beforeAll(async () => {
    // requires docker compose up — skip if DATABASE_URL not set
    ({ getPool } = await import("../../../../lib/db/pool.js"));
    ({ getNeighborhoodFromDb } =
      await import("../../../../lib/db/neighborhoodRepo.js"));
    const pool = getPool();
    await pool.query(
      `INSERT INTO markets (zip, city, state, state_code)
       VALUES ($1,'Testville','Pennsylvania','PA')
       ON CONFLICT (zip) DO UPDATE SET city='Testville'`,
      [ZIP],
    );
    await pool.query(
      `INSERT INTO economic_indicators (geo, metric, value, source, period)
       VALUES ($1,'median_income',60000,'CENSUS_ACS5','2022-12-31')
       ON CONFLICT (geo,metric,source,period) DO UPDATE SET value=60000`,
      [ZIP],
    );
    await pool.query(
      `INSERT INTO rent_benchmarks (zip, bedroom, fmr, source, period)
       VALUES ($1,2,1200,'HUD_FMR','2025')
       ON CONFLICT (zip,bedroom,source,period) DO UPDATE SET fmr=1200`,
      [ZIP],
    );
  });

  afterAll(async () => {
    if (!getPool) return;
    const pool = getPool();
    await pool.query("DELETE FROM markets WHERE zip=$1", [ZIP]);
    await pool.query("DELETE FROM economic_indicators WHERE geo=$1", [ZIP]);
    await pool.query("DELETE FROM rent_benchmarks WHERE zip=$1", [ZIP]);
  });

  it("returns assembled result with dataAsOf timestamp", async () => {
    const result = await getNeighborhoodFromDb(ZIP);
    expect(result).not.toBeNull();
    expect(result.location.zip).toBe(ZIP);
    expect(result.location.city).toBe("Testville");
    expect(result.census.medianIncome).toBe(60000);
    expect(result.fmr.twoBed).toBe(1200);
    expect(result.dataAsOf).not.toBeNull();
    expect(result.source).toBe("postgres");
  });

  it("returns null for an unknown zip", async () => {
    const result = await getNeighborhoodFromDb("00000");
    expect(result).toBeNull();
  });

  it("neighborhoodScore is between 0 and 100", async () => {
    const result = await getNeighborhoodFromDb(ZIP);
    expect(result.neighborhoodScore).toBeGreaterThanOrEqual(0);
    expect(result.neighborhoodScore).toBeLessThanOrEqual(100);
  });
});

// Always-running smoke test: verify the module exports exist without a DB
describe("getNeighborhoodFromDb module shape", () => {
  it("exports getNeighborhoodFromDb as a function", async () => {
    const mod = await import("../../../../lib/db/neighborhoodRepo.js");
    expect(typeof mod.getNeighborhoodFromDb).toBe("function");
  });
});
