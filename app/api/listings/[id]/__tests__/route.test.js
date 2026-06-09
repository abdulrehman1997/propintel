// app/api/listings/[id]/__tests__/route.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../../lib/db/listingsRepo.js", () => ({
  getListingById: vi.fn(),
}));

import { getListingById } from "../../../../../lib/db/listingsRepo.js";
import { GET } from "../route.js";

const ctx = (id) => ({ params: Promise.resolve({ id }) });
const req = () => new Request("http://localhost/api/listings/1");

describe("GET /api/listings/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the listing when found", async () => {
    getListingById.mockResolvedValue({ id: 1, price: 200000 });
    const res = await GET(req(), ctx("1"));
    expect(res.status).toBe(200);
    expect((await res.json()).listing.id).toBe(1);
  });

  it("404s when not found", async () => {
    getListingById.mockResolvedValue(null);
    const res = await GET(req(), ctx("999"));
    expect(res.status).toBe(404);
  });

  it("404s on repo error", async () => {
    getListingById.mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await GET(req(), ctx("1"));
    expect(res.status).toBe(404);
  });
});
