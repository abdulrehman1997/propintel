// updater/__tests__/normalizeListing.test.js
import { describe, it, expect } from "vitest";
import { normalizeListing, IN_SCOPE_STATES } from "../lib/normalizeListing.js";

const row = {
  brokered_by: "123",
  status: "for_sale",
  price: "285000",
  bed: "3",
  bath: "2",
  acre_lot: "0.18",
  street: "412 Mulberry St",
  city: "Harrisburg",
  state: "Pennsylvania",
  zip_code: "17101",
  house_size: "1540",
  prev_sold_date: "2019-05-01",
};

describe("normalizeListing", () => {
  it("maps a Realtor.com row to the listings shape", () => {
    const n = normalizeListing(row);
    expect(n).toMatchObject({
      source: "KAGGLE_REALTOR",
      status: "for_sale",
      city: "Harrisburg",
      state: "PA",
      zip: "17101",
      price: 285000,
      beds: 3,
      baths: 2,
      sqft: 1540,
      lot_acres: 0.18,
      property_type: "single_family",
    });
  });

  it("pads ZIP to 5 digits", () => {
    expect(normalizeListing({ ...row, zip_code: "1701" }).zip).toBe("01701");
  });

  it("nulls numeric/empty street ids but keeps real street names", () => {
    expect(normalizeListing({ ...row, street: "263302.0" }).street).toBeNull();
    expect(normalizeListing({ ...row, street: "  " }).street).toBeNull();
    expect(normalizeListing({ ...row, street: "412 Mulberry St" }).street).toBe(
      "412 Mulberry St",
    );
  });

  it("returns null when required fields are missing or out of scope", () => {
    expect(normalizeListing({ ...row, price: "" })).toBeNull();
    expect(normalizeListing({ ...row, zip_code: "" })).toBeNull();
    expect(normalizeListing({ ...row, bed: "" })).toBeNull();
    expect(normalizeListing({ ...row, status: "sold" })).toBeNull();
    expect(normalizeListing({ ...row, state: "California" })).toBeNull(); // not in scope
  });

  it("exposes the in-scope state allowlist", () => {
    expect(IN_SCOPE_STATES).toContain("PA");
  });
});
