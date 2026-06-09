import { describe, it, expect } from "vitest";
import {
  monthlyPayment,
  annualDebtService,
  mortgageConstant,
  loanBalance,
  npv,
  irr,
  dscr,
  debtYield,
  sizeMaxLoan,
  terminalValue,
  netSaleProceeds,
  equityMultiple,
} from "../lib/finance.js";

describe("amortization primitives", () => {
  it("computes monthly P&I for a 30yr fixed", () => {
    // $200,000 @ 6% / 30yr => ~$1199.10
    expect(monthlyPayment(200000, 0.06, 30)).toBeCloseTo(1199.1, 1);
  });
  it("falls back to straight-line when rate is 0", () => {
    expect(monthlyPayment(360000, 0, 30)).toBeCloseTo(1000, 6);
  });
  it("annual debt service is 12x monthly", () => {
    expect(annualDebtService(200000, 0.06, 30)).toBeCloseTo(1199.1 * 12, 0);
  });
  it("mortgage constant K = annual P&I per $1 (6.5% / 25yr ~ 0.08102)", () => {
    // Actual: 12*(r/(1-(1+r)^-n)) with r=0.065/12 => ~0.081025
    expect(mortgageConstant(0.065, 25)).toBeCloseTo(0.08102, 4);
  });
  it("interest-only mortgage constant equals the annual rate", () => {
    expect(mortgageConstant(0.065, 25, { interestOnly: true })).toBeCloseTo(
      0.065,
      6,
    );
  });
  it("remaining balance after 5yr on 200k/6%/30yr ~ 186,108", () => {
    expect(loanBalance(200000, 0.06, 30, 5)).toBeCloseTo(186108, -2);
  });
});

describe("npv / irr", () => {
  it("npv at 10% of [-1000, 500, 500, 500] ~ 243.43", () => {
    expect(npv(0.1, [-1000, 500, 500, 500])).toBeCloseTo(243.43, 1);
  });
  it("irr of [-1000, 500, 500, 500] ~ 0.2338", () => {
    expect(irr([-1000, 500, 500, 500])).toBeCloseTo(0.2338, 3);
  });
  it("irr of a simple double-in-1yr stream is 100%", () => {
    expect(irr([-100, 200])).toBeCloseTo(1.0, 4);
  });
  it("irr returns null when stream never changes sign", () => {
    expect(irr([100, 200, 300])).toBeNull();
  });
});

describe("lender ratios", () => {
  it("DSCR = NOI / annual debt service", () => {
    expect(dscr(120000, 96000)).toBeCloseTo(1.25, 6);
  });
  it("debt yield = NOI / loan", () => {
    expect(debtYield(2000000, 17500000)).toBeCloseTo(0.114286, 5);
  });
  it("guards divide-by-zero with 0", () => {
    expect(dscr(120000, 0)).toBe(0);
    expect(debtYield(120000, 0)).toBe(0);
  });
});

describe("debt sizing (WSP example)", () => {
  // NOI $2.0M, cap 8% => value $25M; maxLTV 70%, minDY 8%, minDSCR 1.25, rate 6.5%, amort 25yr
  const args = {
    noi: 2_000_000,
    value: 25_000_000,
    maxLTV: 0.7,
    minDebtYield: 0.08,
    minDSCR: 1.25,
    rate: 0.065,
    amortYears: 25,
  };
  it("Loan_LTV = 17.5M, Loan_DY = 25M, Loan_DSCR ~ 19.75M, MIN = 17.5M (LTV binds)", () => {
    const r = sizeMaxLoan(args);
    expect(r.loanLTV).toBeCloseTo(17_500_000, -2);
    expect(r.loanDebtYield).toBeCloseTo(25_000_000, -2);
    expect(r.loanDSCR).toBeCloseTo(19_750_000, -4);
    expect(r.maxLoan).toBeCloseTo(17_500_000, -2);
    expect(r.bindingConstraint).toBe("LTV");
  });
  it("debt yield binds in a high-rate / low-cap scenario", () => {
    const r = sizeMaxLoan({ ...args, minDebtYield: 0.12 });
    expect(r.maxLoan).toBeCloseTo(16_666_667, -2); // 2M / 0.12
    expect(r.bindingConstraint).toBe("DebtYield");
  });
});

describe("exit and equity", () => {
  it("terminalValue = forward NOI / exit cap", () => {
    expect(terminalValue(2_100_000, 0.085)).toBeCloseTo(24_705_882, -2);
  });
  it("netSaleProceeds = value*(1-saleCost) - loanBalance", () => {
    expect(netSaleProceeds(24_705_882, 0.02, 16_000_000)).toBeCloseTo(
      24_705_882 * 0.98 - 16_000_000,
      0,
    );
  });
  it("equityMultiple = total distributions / equity invested", () => {
    expect(equityMultiple([50000, 50000, 50000, 600000], 350000)).toBeCloseTo(
      2.142857,
      5,
    );
  });
});
