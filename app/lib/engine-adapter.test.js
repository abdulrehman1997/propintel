import { describe, it, expect } from "vitest";
import {
  analyzeResidentialDeal,
  analyzeCommercialDeal,
  validateEngineInput,
  residentialSensitivityCompute,
} from "./engine-adapter";

const resInputs = {
  purchasePrice: 350000,
  downPaymentPct: 20,
  interestRate: 7,
  loanTermYears: 30,
  annualPropertyTax: 4200,
  annualInsurance: 1800,
  monthlyRent: 2200,
  vacancyPct: 5,
  managementPct: 10,
  maintenancePct: 1,
  capExPct: 5,
  holdYears: 5,
  appreciationPct: 3,
};

const comInputs = {
  assetType: "multifamily",
  purchasePrice: 2000000,
  rentableSqft: 12000,
  units: [{ count: 8, marketRent: 2500, inPlaceRent: 2400 }],
  leaseType: "gross",
  vacancyPct: 5,
  creditLossPct: 1,
  opexAnnual: 96000,
  goingInCapRate: 6,
  exitCapRate: 6.5,
  maxLTV: 75,
  minDSCR: 1.25,
  minDebtYield: 8,
  interestRate: 7,
  amortYears: 25,
  holdYears: 5,
  rentGrowthPct: 3,
  expenseGrowthPct: 3,
  saleCostPct: 2,
};

describe("engine-adapter residential", () => {
  it("maps real residential engine keys into the UI result", () => {
    const r = analyzeResidentialDeal(resInputs);
    expect(r.mode).toBe("residential");
    expect(r.irr).toBeTypeOf("number");
    expect(r.equityMultiple).toBeTypeOf("number");
    expect(r.dscr).toBeGreaterThan(0);
    expect(r.exitValue).toBeGreaterThan(0);
    expect(r.projections).toHaveLength(5);
  });
});

describe("engine-adapter commercial", () => {
  it("exposes debt sizing with binding constraint and IRR pair", () => {
    const r = analyzeCommercialDeal(comInputs);
    expect(r.mode).toBe("commercial");
    expect(["LTV", "DSCR", "DebtYield"]).toContain(r.bindingConstraint);
    expect(r.pricePerUnit).toBeGreaterThan(0);
    expect(r.oer).toBeGreaterThan(0);
    expect(r.leveredIRR).toBeTypeOf("number");
    expect(r.unleveredIRR).toBeTypeOf("number");
  });
});

describe("validateEngineInput", () => {
  it("passes valid residential inputs against the engine schema", () => {
    expect(validateEngineInput("residential", resInputs).success).toBe(true);
  });
  it("reports field errors for invalid input", () => {
    const v = validateEngineInput("residential", {
      ...resInputs,
      purchasePrice: 0,
    });
    expect(v.success).toBe(false);
    expect(v.errors.purchasePrice).toBeTruthy();
  });
  it("validates commercial inputs against the engine schema", () => {
    expect(validateEngineInput("commercial", comInputs).success).toBe(true);
  });
});

describe("residentialSensitivityCompute", () => {
  it("returns a CoC percentage number", () => {
    const v = residentialSensitivityCompute(resInputs);
    expect(v).toBeTypeOf("number");
  });
});
