// app/lib/listing-adapter.test.js
import { describe, it, expect } from "vitest";
import { listingToResidentialInputs } from "./listing-adapter.js";

const listing = {
  id: 1,
  price: 285000,
  beds: 3,
  baths: 2,
  sqft: 1540,
  zip: "17101",
  city: "Harrisburg",
  state: "PA",
};

describe("listingToResidentialInputs", () => {
  it("uses listing price and FMR rent for the matching bedroom", () => {
    const fmr = { studio: 900, oneBed: 1100, twoBed: 1400, threeBed: 1750 };
    const inp = listingToResidentialInputs(listing, fmr);
    expect(inp.purchasePrice).toBe(285000);
    expect(inp.monthlyRent).toBe(1750); // 3BR
    expect(inp.bedrooms).toBe(3);
    expect(inp.zipCode).toBe("17101");
  });

  it("falls back through bedroom tiers then to a price ratio when FMR missing", () => {
    expect(
      listingToResidentialInputs(listing, { twoBed: 1400 }).monthlyRent,
    ).toBe(1400); // 3BR missing → twoBed
    const noFmr = listingToResidentialInputs(listing, {});
    expect(noFmr.monthlyRent).toBeGreaterThan(0); // price-based fallback (~0.7% rule)
  });

  it("estimates property tax as a percent of price and keeps engine defaults", () => {
    const inp = listingToResidentialInputs(listing, { threeBed: 1750 });
    expect(inp.annualPropertyTax).toBeCloseTo(285000 * 0.011, 0);
    expect(inp.downPaymentPct).toBe(20);
    expect(inp.interestRate).toBeGreaterThan(0);
  });
});
