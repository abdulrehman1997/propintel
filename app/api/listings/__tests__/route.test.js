import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../lib/db/listingsRepo.js", () => ({
  findListings: vi.fn(),
}));

import { findListings } from "../../../../lib/db/listingsRepo.js";
import { GET } from "../route.js";

const req = (qs) => new Request(`http://localhost/api/listings?${qs}`);

describe("GET /api/listings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns rows from the repo", async () => {
    findListings.mockResolvedValue([{ id: 1, price: 200000 }]);
    const res = await GET(req("zip=17101"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.listings).toHaveLength(1);
    expect(findListings).toHaveBeenCalledWith(
      expect.objectContaining({ zip: "17101" }),
    );
  });

  it("forwards the new filters to findListings", async () => {
    findListings.mockResolvedValue([]);
    await GET(req("minBaths=2&propertyType=condo&status=for_sale&minYield=7&grade=B"));
    expect(findListings).toHaveBeenCalledWith(
      expect.objectContaining({
        minBaths: "2",
        propertyType: "condo",
        status: "for_sale",
        minYield: "7",
        grade: "B",
      }),
    );
  });

  it("degrades to an empty list when the DB throws", async () => {
    findListings.mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await GET(req(""));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.listings).toEqual([]);
    expect(body.source).toBe("unavailable");
  });
});
