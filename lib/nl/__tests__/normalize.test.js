import { describe, it, expect } from "vitest";
import { applyDeterministic } from "../normalize.js";

describe("applyDeterministic", () => {
  it("extracts maxPrice from 'under 300k' even when the model missed it", () => {
    const out = applyDeterministic("3 bed condo under 300k", { beds: 3 });
    expect(out.maxPrice).toBe(300000);
  });

  it("extracts a price range from 'between 150k and 400k'", () => {
    const out = applyDeterministic("homes between 150k and 400k", {});
    expect(out.minPrice).toBe(150000);
    expect(out.maxPrice).toBe(400000);
  });

  it("handles 'over 200k' as minPrice", () => {
    const out = applyDeterministic("houses over 200k", {});
    expect(out.minPrice).toBe(200000);
  });

  it("does NOT treat 'at least 2 baths' as a price", () => {
    const out = applyDeterministic("at least 2 baths", {});
    expect(out.minPrice).toBeUndefined();
    expect(out.minBaths).toBe(2);
  });

  it("extracts beds and baths together", () => {
    const out = applyDeterministic("3 bed over 2 baths", {});
    expect(out.beds).toBe(3);
    expect(out.minBaths).toBe(2);
  });

  it("maps 'for sale' and 'sold' to status", () => {
    expect(applyDeterministic("for sale", {}).status).toBe("for_sale");
    expect(applyDeterministic("sold townhouses", {}).status).toBe("sold");
  });

  it("strips hallucinated grade when query never mentions yield", () => {
    const out = applyDeterministic("sold townhouses over 2 baths", {
      grade: "A",
      minYield: 0,
      status: "sold",
    });
    expect(out.grade).toBeUndefined();
    expect(out.minYield).toBeUndefined();
  });

  it("keeps grade when the query mentions yield", () => {
    const out = applyDeterministic("condos with good yield", { grade: "A" });
    expect(out.grade).toBe("A");
  });

  it("preserves model-owned fuzzy fields (q, propertyType)", () => {
    const out = applyDeterministic("3 bed apartments in Brooklyn", {
      q: "Brooklyn",
      propertyType: "condo",
      beds: 3,
    });
    expect(out.q).toBe("Brooklyn");
    expect(out.propertyType).toBe("condo");
  });

  it("supports comma and m suffixes", () => {
    expect(applyDeterministic("under 250,000", {}).maxPrice).toBe(250000);
    expect(applyDeterministic("under 1.2m", {}).maxPrice).toBe(1200000);
  });

  it("derives propertyType from keywords, overriding a model omission", () => {
    expect(applyDeterministic("sold townhouses over 2 baths", {}).propertyType).toBe("townhouse");
    expect(applyDeterministic("multi family homes", {}).propertyType).toBe("multi_family");
    expect(applyDeterministic("apartments in Brooklyn", {}).propertyType).toBe("condo");
    expect(applyDeterministic("a house for sale", {}).propertyType).toBe("single_family");
  });

  it("drops q when the model put price junk in it", () => {
    const out = applyDeterministic("homes between 150k and 400k", {
      q: "between 150k and 400k",
    });
    expect(out.q).toBeUndefined();
    expect(out.minPrice).toBe(150000);
    expect(out.maxPrice).toBe(400000);
  });

  it("keeps a real location in q", () => {
    expect(applyDeterministic("homes in Harrisburg", { q: "Harrisburg" }).q).toBe("Harrisburg");
    expect(applyDeterministic("in 17101", { q: "17101" }).q).toBe("17101");
  });
});
