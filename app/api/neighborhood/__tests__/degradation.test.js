/**
 * Graceful-degradation tests for the neighborhood GET handler.
 *
 * When Postgres is unseeded AND live API keys are absent, the route must return
 * HTTP 200 with a fully-shaped, null-valued payload (source: "unavailable")
 * rather than a 500 that breaks the neighborhood panel. Runs without Docker or
 * API keys by mocking the repo read path.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Postgres read path so no real connection is attempted.
vi.mock("../../../../lib/db/neighborhoodRepo.js", () => ({
  getNeighborhoodFromDb: vi.fn(),
}));

import { getNeighborhoodFromDb } from "../../../../lib/db/neighborhoodRepo.js";
import { GET } from "../route.js";

const makeRequest = (zip) =>
  new Request(`http://localhost/api/neighborhood?zip=${zip}`);

describe("GET /api/neighborhood — graceful degradation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CENSUS_API_KEY;
    delete process.env.HUD_API_TOKEN;
  });

  it("returns 200 with an unavailable payload when DB empty and keys missing", async () => {
    getNeighborhoodFromDb.mockResolvedValue(null);

    const res = await GET(makeRequest("99999"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.source).toBe("unavailable");
    expect(body.location.zip).toBe("99999");
    expect(body.neighborhoodScore).toBeNull();
    expect(body.census.medianIncome).toBeNull();
    expect(body.fmr.isSafmr).toBe(false);
    expect(typeof body.message).toBe("string");
  });

  it("degrades to 200 when the DB read throws", async () => {
    getNeighborhoodFromDb.mockRejectedValue(new Error("ECONNREFUSED"));

    const res = await GET(makeRequest("88888"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.source).toBe("unavailable");
    expect(body.location.zip).toBe("88888");
  });

  it("still rejects an invalid zip with 400", async () => {
    const res = await GET(makeRequest("12"));
    expect(res.status).toBe(400);
  });
});
