import { describe, it, expect } from "vitest";
import {
  THRESHOLDS,
  EXPENSE_DEFAULTS,
  CRE_THRESHOLDS,
} from "../lib/constants.js";

describe("THRESHOLDS", () => {
  it("encodes residential decision bands from the spec", () => {
    expect(THRESHOLDS.cocMin).toBe(0.08);
    expect(THRESHOLDS.cocStrong).toBe(0.12);
    expect(THRESHOLDS.dscrFloor).toBe(1.2);
    expect(THRESHOLDS.dscrStrong).toBe(1.4);
    expect(THRESHOLDS.debtYieldMin).toBe(0.1);
    expect(THRESHOLDS.irrTarget).toBe(0.15);
    expect(THRESHOLDS.emTarget).toBe(2.0);
    expect(THRESHOLDS.grmGood).toBe(8);
    expect(THRESHOLDS.grmExpensive).toBe(15);
    expect(THRESHOLDS.breakEvenOccMax).toBe(0.85);
    expect(THRESHOLDS.seventyRuleArvPct).toBe(0.7);
  });
});

describe("EXPENSE_DEFAULTS", () => {
  it("encodes vacancy/maintenance/capex defaults by class and age", () => {
    expect(EXPENSE_DEFAULTS.vacancy).toEqual({ A: 0.04, B: 0.06, C: 0.09 });
    expect(EXPENSE_DEFAULTS.maintenance).toEqual({
      new: 0.05,
      mid: 0.08,
      old: 0.1,
    });
    expect(EXPENSE_DEFAULTS.capex).toEqual({ new: 0.05, mid: 0.07, old: 0.1 });
    expect(EXPENSE_DEFAULTS.management).toBe(0.1);
  });
  it("encodes CRE min DSCR/debt-yield/LTV by asset type", () => {
    expect(CRE_THRESHOLDS.multifamily.minDSCR).toBe(1.25);
    expect(CRE_THRESHOLDS.multifamily.minDebtYield).toBe(0.08);
    expect(CRE_THRESHOLDS.multifamily.maxLTV).toBe(0.75);
    expect(CRE_THRESHOLDS.retail.minDSCR).toBe(1.4);
    expect(CRE_THRESHOLDS.office.minDebtYield).toBe(0.12);
  });
});
