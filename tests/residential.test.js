import { describe, it, expect } from 'vitest';
import { analyzeResidential } from '../lib/residential.js';

const input = {
  purchasePrice: 250000, repairCosts: 0, downPaymentPct: 20, interestRate: 6.5,
  loanTermYears: 30, annualPropertyTax: 3000, annualInsurance: 1200, monthlyHOA: 0,
  monthlyRent: 2200, vacancyPct: 5, managementPct: 10, maintenancePct: 5, capExPct: 5,
};

describe('analyzeResidential income & NOI', () => {
  const r = analyzeResidential(input);
  it('GSI = monthlyRent * 12', () => {
    expect(r.gsi).toBeCloseTo(26400, 6);
  });
  it('EGI = GSI - vacancy (5%)', () => {
    expect(r.egi).toBeCloseTo(25080, 6); // 26400 * 0.95
  });
  it('NOI excludes mortgage; = EGI - opex', () => {
    // opex: mgmt 10%*rent*12=2640, maint 5%*price/yr=12500, capex 5%*rent*12=1320,
    // tax 3000, ins 1200, HOA 0 ; NOI = 25080 - (2640+12500+1320+3000+1200) = 4420
    expect(r.noi).toBeCloseTo(4420, 0);
  });
  it('cap rate = NOI / purchasePrice', () => {
    expect(r.capRate).toBeCloseTo(4420 / 250000, 6);
  });
  it('GRM = price / annual gross rent', () => {
    expect(r.grm).toBeCloseTo(250000 / 26400, 4);
  });
  it('1% rule = monthlyRent / price', () => {
    expect(r.onePercentRule).toBeCloseTo(2200 / 250000, 6);
  });
  it('exposes loanAmount, totalCashInvested, DSCR, cashOnCash, breakEvenOccupancy', () => {
    expect(r.loanAmount).toBeCloseTo(200000, 6);
    expect(r.dscr).toBeGreaterThan(0);
    expect(r.breakEvenOccupancy).toBeGreaterThan(0);
    expect(Array.isArray(r.warnings)).toBe(true);
  });
});
