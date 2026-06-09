import { describe, it, expect } from "vitest";
import {
  residentialSchema,
  commercialSchema,
  validateDeal,
} from "./deal-schema";

describe("residentialSchema", () => {
  it("accepts a valid residential deal", () => {
    const r = validateDeal("residential", {
      purchasePrice: 350000,
      downPaymentPct: 20,
      interestRate: 7,
      loanTermYears: 30,
      monthlyRent: 2200,
      vacancyPct: 5,
      managementPct: 10,
      maintenancePct: 1,
      capExPct: 5,
      annualPropertyTax: 4200,
      annualInsurance: 1800,
      monthlyHOA: 0,
      repairCosts: 0,
      zipCode: "90210",
      bedrooms: 3,
    });
    expect(r.success).toBe(true);
  });
  it("rejects non-positive purchase price with a clear message", () => {
    const r = validateDeal("residential", { purchasePrice: 0 });
    expect(r.success).toBe(false);
    expect(r.errors.purchasePrice).toBe(
      "Purchase price must be greater than 0",
    );
  });
  it("rejects a zip code that is not 5 digits", () => {
    const r = validateDeal("residential", {
      purchasePrice: 100000,
      zipCode: "12",
    });
    expect(r.success).toBe(false);
    expect(r.errors.zipCode).toBe("Zip code must be 5 digits");
  });
});

describe("commercialSchema", () => {
  it("rejects square feet of zero", () => {
    const r = validateDeal("commercial", {
      purchasePrice: 2000000,
      squareFeet: 0,
    });
    expect(r.success).toBe(false);
    expect(r.errors.squareFeet).toBe("Square feet must be greater than 0");
  });
});
