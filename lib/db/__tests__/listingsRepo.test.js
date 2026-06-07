// lib/db/__tests__/listingsRepo.test.js
import { describe, it, expect } from "vitest";
import { buildListingsQuery } from "../listingsRepo.js";

describe("buildListingsQuery", () => {
  it("filters by zip, beds, and price range with params", () => {
    const { text, values } = buildListingsQuery({
      zip: "17101",
      beds: 3,
      minPrice: 100000,
      maxPrice: 300000,
      page: 2,
      pageSize: 24,
    });
    expect(text).toMatch(/where/i);
    expect(text).toMatch(/zip = \$\d/);
    expect(text).toMatch(/beds >= \$\d/);
    expect(text).toMatch(/price >= \$\d/);
    expect(text).toMatch(/price <= \$\d/);
    expect(text).toMatch(/limit \$\d offset \$\d/i);
    expect(values).toContain("17101");
    expect(values).toContain(24); // limit
    expect(values).toContain(24); // offset = (2-1)*24
  });

  it("limits to sellable/sold statuses and applies defaults with no filters", () => {
    const { text, values } = buildListingsQuery({});
    expect(text).toMatch(/status IN \('for_sale', 'sold'\)/);
    expect(values).toContain(24); // default pageSize
  });
});
