import { describe, it, expect } from "vitest";
import {
  residentialInputSchema,
  commercialInputSchema,
  validateInput,
} from "../lib/schemas.js";

describe("residentialInputSchema", () => {
  const valid = {
    purchasePrice: 250000,
    repairCosts: 0,
    downPaymentPct: 20,
    interestRate: 6.5,
    loanTermYears: 30,
    annualPropertyTax: 3000,
    annualInsurance: 1200,
    monthlyHOA: 0,
    monthlyRent: 2200,
    vacancyPct: 5,
    managementPct: 10,
    maintenancePct: 5,
    capExPct: 5,
  };
  it("accepts a valid residential input", () => {
    const r = validateInput(residentialInputSchema, valid);
    expect(r.ok).toBe(true);
    expect(r.data.purchasePrice).toBe(250000);
  });
  it("rejects negative purchase price with a clear message", () => {
    const r = validateInput(residentialInputSchema, {
      ...valid,
      purchasePrice: -1,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });
  it("rejects vacancy > 100", () => {
    const r = validateInput(residentialInputSchema, {
      ...valid,
      vacancyPct: 150,
    });
    expect(r.ok).toBe(false);
  });
});

describe("commercialInputSchema", () => {
  it("accepts a valid commercial input", () => {
    const r = validateInput(commercialInputSchema, {
      assetType: "multifamily",
      purchasePrice: 25000000,
      vacancyPct: 5,
      opexAnnual: 400000,
      goingInCapRate: 8,
      exitCapRate: 8.5,
      maxLTV: 70,
      minDSCR: 1.25,
      minDebtYield: 8,
      interestRate: 6.5,
      amortYears: 25,
      holdYears: 5,
      rentGrowthPct: 3,
      expenseGrowthPct: 3,
    });
    expect(r.ok).toBe(true);
  });
  it("rejects an unknown asset type", () => {
    const r = validateInput(commercialInputSchema, {
      assetType: "farm",
      purchasePrice: 1,
    });
    expect(r.ok).toBe(false);
  });
});
