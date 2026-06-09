import { describe, it, expect } from "vitest";
import { analyzeBRRRR } from "../lib/brrrr.js";

// Concrete BRRRR: buy 100k, rehab 35k, ARV 200k, refi 75% LTV => refi loan 150k.
// Carry: hard money 10%/yr on (purchase+rehab)=135k for 6 months = 6,750 + 0 flat carry.
// Buy closing = 3% * 100k = 3,000. All-in = 100k + 35k + 3k + 6.75k = 144,750.
// Refi loan 150k > all-in 144,750 => cash left in deal = -5,250 (capital fully recovered).
const input = {
  purchasePrice: 100000,
  rehabBudget: 35000,
  arv: 200000,
  closingCostsBuyPct: 3,
  hardMoneyRate: 10,
  rehabMonths: 6,
  otherCarryAnnual: 0,
  refiLtv: 75,
  refiRate: 7,
  refiAmortYears: 30,
  // income/opex => NOI (matches residential conventions): rent 2400/mo
  monthlyRent: 2400,
  vacancyPct: 5,
  managementPct: 10,
  maintenancePct: 5,
  capExPct: 5,
  annualPropertyTax: 1500,
  annualInsurance: 900,
  monthlyHOA: 0,
  // residential schema needs these (not used for NOI)
  downPaymentPct: 0,
  interestRate: 0,
  loanTermYears: 30,
};

describe("analyzeBRRRR", () => {
  const r = analyzeBRRRR(input);
  it("refi loan = ARV * refiLtv", () => {
    expect(r.refiLoan).toBeCloseTo(150000, 6); // 200000 * 0.75
  });
  it("all-in cost includes purchase + rehab + buy closing + carry", () => {
    expect(r.buyClosingCosts).toBeCloseTo(3000, 6); // 3% * 100k
    expect(r.carryCosts).toBeCloseTo(6750, 6); // 135000 * 0.10 * 6/12
    expect(r.allInCost).toBeCloseTo(144750, 6); // 100000+35000+3000+6750
  });
  it("NOI reuses the residential income build-up", () => {
    // gsi 28800; egi 27360; opex 2880+5000+1440+1500+900=11720; NOI=15640
    expect(r.noi).toBeCloseTo(15640, 0);
  });
  it("cash left in deal = all-in - refi loan; cash out = refi loan - all-in", () => {
    expect(r.cashLeftInDeal).toBeCloseTo(-5250, 6); // 144750 - 150000
    expect(r.cashOut).toBeCloseTo(5250, 6);
  });
  it("post-refi cash flow = NOI - refi ADS", () => {
    // ADS(150000, 7%, 30) ~ 11,975.44 ; postRefiCF ~ 3,664.56
    expect(r.refiAnnualDebtService).toBeCloseTo(11975.44, 1);
    expect(r.postRefiCashFlow).toBeCloseTo(3664.56, 1);
  });
  it("flags an infinite return when capital is fully recovered and CF positive", () => {
    expect(r.infiniteReturn).toBe(true);
    expect(r.postRefiCoC).toBeNull(); // CoC undefined when no cash remains in deal
    expect(Array.isArray(r.warnings)).toBe(true);
  });
  it("reports a finite post-refi CoC when capital remains in the deal", () => {
    const partial = analyzeBRRRR({ ...input, refiLtv: 67.5 }); // refi 135k < all-in 144,750
    expect(partial.cashLeftInDeal).toBeCloseTo(9750, 6); // 144750 - 135000
    expect(partial.infiniteReturn).toBe(false);
    expect(partial.postRefiCoC).toBeCloseTo(partial.postRefiCashFlow / 9750, 6);
  });
});
