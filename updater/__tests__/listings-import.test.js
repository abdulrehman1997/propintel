// @vitest-environment node
// listings.js resolves its CSV path via fileURLToPath(import.meta.url); jsdom
// gives import.meta.url a non-file scheme, so this suite must run under node.
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const hasDocker = !!process.env.DATABASE_URL;

describe.skipIf(!hasDocker)("upsertListings (real Postgres)", () => {
  let pool;
  let runSchema;
  let upsertListings;

  const rows = [
    {
      source: "TEST",
      status: "for_sale",
      street: "1 Test St",
      city: "Harrisburg",
      state: "PA",
      zip: "17101",
      price: 200000,
      beds: 3,
      baths: 2,
      sqft: 1400,
      lot_acres: 0.1,
      property_type: "single_family",
      list_date: null,
    },
  ];

  beforeAll(async () => {
    ({ pool } = await import("../db.js"));
    ({ runSchema } = await import("../db.js"));
    ({ upsertListings } = await import("../listings.js"));
    await runSchema();
  });

  afterAll(async () => {
    // Clean up test rows only. Do NOT end the shared pool here — other
    // Docker-gated suites in the same run reuse the same pg pool instance.
    await pool.query("DELETE FROM listings WHERE source='TEST'");
  });

  it("inserts then is idempotent on re-run", async () => {
    await upsertListings(rows);
    await upsertListings(rows); // same key → no duplicate
    const { rows: out } = await pool.query(
      "SELECT count(*)::int AS n FROM listings WHERE source='TEST'",
    );
    expect(out[0].n).toBe(1);
  });
});
