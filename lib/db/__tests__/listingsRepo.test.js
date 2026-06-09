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

  it("filters by minBaths with a param", () => {
    const { text } = buildListingsQuery({ minBaths: 2 });
    expect(text).toMatch(/baths >= \$\d/);
  });

  it("filters by propertyType with a param", () => {
    const { text, values } = buildListingsQuery({ propertyType: "condo" });
    expect(text).toMatch(/property_type = \$\d/);
    expect(values).toContain("condo");
  });

  it("status filter overrides the default IN clause", () => {
    const { text, values } = buildListingsQuery({ status: "for_sale" });
    expect(text).toMatch(/status = \$\d/);
    expect(text).not.toMatch(/status IN/);
    expect(values).toContain("for_sale");
  });

  it("keeps default status IN clause when status omitted", () => {
    const { text } = buildListingsQuery({});
    expect(text).toMatch(/status IN \('for_sale', 'sold'\)/);
  });

  it("ignores an invalid status and keeps the default", () => {
    const { text } = buildListingsQuery({ status: "pending" });
    expect(text).toMatch(/status IN \('for_sale', 'sold'\)/);
  });

  it("filters by minYield as a decimal ratio param", () => {
    const { text, values } = buildListingsQuery({ minYield: 8 });
    expect(text).toMatch(/rent_zestimate \* 12\.0 \/ NULLIF\(price, 0\)\) >= \$\d/);
    expect(values).toContain(0.08);
  });

  it("grade A adds a lower bound only", () => {
    const { values } = buildListingsQuery({ grade: "A" });
    expect(values).toContain(0.1);
    expect(values).not.toContain(0.07);
  });

  it("grade B adds lower and upper bounds", () => {
    const { values } = buildListingsQuery({ grade: "B" });
    expect(values).toContain(0.07);
    expect(values).toContain(0.1);
  });

  it("SELECT exposes a computed deal_grade column", () => {
    const { text } = buildListingsQuery({});
    expect(text).toMatch(/AS deal_grade/);
  });
});
