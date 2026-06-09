import { describe, it, expect } from "vitest";
import { analyzeResidential, projectResidential } from "../lib/residential.js";

const input = {
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

describe("analyzeResidential income & NOI", () => {
  const r = analyzeResidential(input);
  it("GSI = monthlyRent * 12", () => {
    expect(r.gsi).toBeCloseTo(26400, 6);
  });
  it("EGI = GSI - vacancy (5%)", () => {
    expect(r.egi).toBeCloseTo(25080, 6); // 26400 * 0.95
  });
  it("NOI excludes mortgage; = EGI - opex", () => {
    // opex: mgmt 10%*rent*12=2640, maint 5%*price/yr=12500, capex 5%*rent*12=1320,
    // tax 3000, ins 1200, HOA 0 ; NOI = 25080 - (2640+12500+1320+3000+1200) = 4420
    expect(r.noi).toBeCloseTo(4420, 0);
  });
  it("cap rate = NOI / purchasePrice", () => {
    expect(r.capRate).toBeCloseTo(4420 / 250000, 6);
  });
  it("GRM = price / annual gross rent", () => {
    expect(r.grm).toBeCloseTo(250000 / 26400, 4);
  });
  it("1% rule = monthlyRent / price", () => {
    expect(r.onePercentRule).toBeCloseTo(2200 / 250000, 6);
  });
  it("exposes loanAmount, totalCashInvested, DSCR, cashOnCash, breakEvenOccupancy", () => {
    expect(r.loanAmount).toBeCloseTo(200000, 6);
    expect(r.dscr).toBeGreaterThan(0);
    expect(r.breakEvenOccupancy).toBeGreaterThan(0);
    expect(Array.isArray(r.warnings)).toBe(true);
  });
});

const input2 = {
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
  rentGrowthPct: 3,
  expenseGrowthPct: 3,
  appreciationPct: 3,
  holdYears: 5,
};

describe("projectResidential", () => {
  const p = projectResidential(input2);
  it("produces 5 yearly projections", () => {
    expect(p.years).toHaveLength(5);
  });
  it("property value grows at appreciationPct (3%) compounding", () => {
    expect(p.years[4].propertyValue).toBeCloseTo(250000 * Math.pow(1.03, 5), 0);
  });
  it("uses USER appreciation (3%), not a hardcoded constant", () => {
    const flat = projectResidential({ ...input2, appreciationPct: 0 });
    expect(flat.years[4].propertyValue).toBeCloseTo(250000, 0);
  });
  it("computes a levered IRR and an equity multiple over the hold", () => {
    expect(p.irr).not.toBeNull();
    expect(p.equityMultiple).toBeGreaterThan(0);
    expect(p.cashFlows[0]).toBeLessThan(0); // initial equity outflow
    expect(p.cashFlows).toHaveLength(6); // CF0..CF5
  });
  it("equity multiple uses the same raw cash-flow stream as IRR (no floor per distribution)", () => {
    // EM = sum(cashFlows[1..N]) / |cashFlows[0]|
    // Must match: sum of raw distributions (not max'd to 0) / totalCashInvested
    const rawSum = p.cashFlows.slice(1).reduce((a, b) => a + b, 0);
    expect(p.equityMultiple).toBeCloseTo(rawSum / Math.abs(p.cashFlows[0]), 6);
  });
});

describe("projectResidential exit cap rate", () => {
  // Profitable fixture: higher rent, lower maintenance so annual cash flows are positive
  // and IRR can converge. exitCapRate=5% → terminal value = NOI_yr6 / 0.05
  const inputWithCap = {
    purchasePrice: 250000,
    repairCosts: 0,
    downPaymentPct: 20,
    interestRate: 6.5,
    loanTermYears: 30,
    annualPropertyTax: 3000,
    annualInsurance: 1200,
    monthlyHOA: 0,
    monthlyRent: 2500,
    vacancyPct: 5,
    managementPct: 8,
    maintenancePct: 1,
    capExPct: 5,
    rentGrowthPct: 3,
    expenseGrowthPct: 3,
    appreciationPct: 3,
    holdYears: 5,
    exitCapRate: 5, // explicit 5% exit cap
    saleCostPct: 7, // explicit 7% sale cost
  };
  const pCap = projectResidential(inputWithCap);

  it("exit-cap path: IRR converges and equity multiple > 1 on profitable deal", () => {
    expect(pCap.irr).not.toBeNull();
    expect(pCap.equityMultiple).toBeGreaterThan(1);
  });

  it("exit-cap path: terminal value differs from appreciation-only path", () => {
    // No exitCapRate and no goingInCapRate → fallback to appreciated property value (~$289k)
    // exitCapRate=5% → terminal value = NOI_yr6 / 0.05 (a different, larger number)
    const noCapInput = { ...inputWithCap, exitCapRate: undefined };
    const pNoCap = projectResidential(noCapInput);
    // The two final CFs must be materially different (terminal-value vs appreciation path)
    expect(Math.abs(pCap.cashFlows[5] - pNoCap.cashFlows[5])).toBeGreaterThan(
      1000,
    );
  });

  it("saleCostPct is threaded through from input (7% costs more than 6%)", () => {
    // Both runs use the appreciation-only fallback so only saleCostPct varies
    const p6 = projectResidential({
      ...inputWithCap,
      saleCostPct: 6,
      exitCapRate: undefined,
    });
    const p7 = projectResidential({
      ...inputWithCap,
      saleCostPct: 7,
      exitCapRate: undefined,
    });
    // higher sale cost → lower final CF
    expect(p7.cashFlows[5]).toBeLessThan(p6.cashFlows[5]);
  });
});
