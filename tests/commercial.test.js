import { describe, it, expect } from 'vitest';
import { analyzeCommercial } from '../lib/commercial.js';

const mf = {
  assetType: 'multifamily', purchasePrice: 25000000, rentableSqft: 100000,
  units: [{ count: 100, marketRent: 1700, inPlaceRent: 1600 }],
  leaseType: 'gross', recoveryRatio: 0,
  vacancyPct: 5, creditLossPct: 0, otherIncomeAnnual: 0,
  opexAnnual: undefined, // provided per-test
  goingInCapRate: 8, exitCapRate: 8.5,
  maxLTV: 70, minDSCR: 1.25, minDebtYield: 8, interestRate: 6.5, amortYears: 25,
  interestOnly: false, holdYears: 5, rentGrowthPct: 3, expenseGrowthPct: 3, saleCostPct: 2,
};

describe('analyzeCommercial income stack', () => {
  it('GPR uses MARKET rent; loss-to-lease = GPR - in-place', () => {
    const r = analyzeCommercial({ ...mf, opexAnnual: 100000 });
    expect(r.gpr).toBeCloseTo(1700 * 100 * 12, 6);   // 2,040,000
    expect(r.gsr).toBeCloseTo(1600 * 100 * 12, 6);   // 1,920,000 (in-place)
    expect(r.lossToLease).toBeCloseTo(120000, 6);
  });
  it('NOI = EGI - opex; OER = opex / EGI; pricePerUnit & pricePerSF', () => {
    const r = analyzeCommercial({ ...mf, opexAnnual: 100000 });
    // GSR 1,920,000 - vacancy 5% (96,000) = EGI 1,824,000 ; NOI = 1,724,000
    expect(r.egi).toBeCloseTo(1824000, 0);
    expect(r.noi).toBeCloseTo(1724000, 0);
    expect(r.oer).toBeCloseTo(100000 / 1824000, 6);
    expect(r.pricePerUnit).toBeCloseTo(250000, 0);   // 25M / 100
    expect(r.pricePerSF).toBeCloseTo(250, 6);        // 25M / 100000
  });
  it('reproduces the WSP debt sizing: LTV binds at $17.5M when NOI=$2.0M, value=$25M', () => {
    const r = analyzeCommercial({
      ...mf, opexAnnual: 0, vacancyPct: 0,
      units: [{ count: 100, marketRent: 1700, inPlaceRent: 1700 }],
    });
    expect(r.debt.bindingConstraint).toBeDefined();
    expect(r.debt.loanLTV).toBeCloseTo(0.70 * r.value, -2);
  });
  it('NNN lease lowers OER via expense recovery', () => {
    const gross = analyzeCommercial({ ...mf, leaseType: 'gross', recoveryRatio: 0, opexAnnual: 400000 });
    const nnn = analyzeCommercial({ ...mf, leaseType: 'NNN', recoveryRatio: 0.9, opexAnnual: 400000 });
    expect(nnn.noi).toBeGreaterThan(gross.noi);
    expect(nnn.oer).toBeLessThan(gross.oer);
  });
});
