import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDealAnalysis } from './useDealAnalysis';

const residentialInputs = {
  purchasePrice: 350000, repairCosts: 0, downPaymentPct: 20, interestRate: 7,
  loanTermYears: 30, annualPropertyTax: 4200, annualInsurance: 1800, monthlyHOA: 0,
  monthlyRent: 2200, vacancyPct: 5, managementPct: 10, maintenancePct: 1, capExPct: 5,
  holdYears: 5, appreciationPct: 3, rentGrowthPct: 3, expenseGrowthPct: 3,
  exitCapRate: 0, saleCostPct: 6, zipCode: '', bedrooms: 3,
};

const commercialInputs = {
  assetType: 'multifamily', purchasePrice: 2000000, rentableSqft: 12000,
  units: [{ count: 8, marketRent: 2500, inPlaceRent: 2400 }], leaseType: 'gross',
  recoveryRatio: 0, vacancyPct: 5, creditLossPct: 1, opexAnnual: 96000,
  goingInCapRate: 6, exitCapRate: 6.5, maxLTV: 75, minDSCR: 1.25, minDebtYield: 8,
  interestRate: 7, amortYears: 25, holdYears: 5, rentGrowthPct: 3, expenseGrowthPct: 3, saleCostPct: 2,
};

describe('useDealAnalysis', () => {
  it('returns real residential engine metrics: IRR, equity multiple, DSCR', () => {
    const { result } = renderHook(() => useDealAnalysis('residential', residentialInputs, null));
    const r = result.current.results;
    expect(r.mode).toBe('residential');
    expect(r.capRate).toBeTypeOf('number');
    expect(r.irr).toBeTypeOf('number');
    expect(r.equityMultiple).toBeTypeOf('number');
    expect(r.dscr).toBeTypeOf('number');
    expect(result.current.projections).toHaveLength(5);
  });

  it('blends neighborhood score when provided', () => {
    const nb = { neighborhoodScore: 90, scoreBreakdown: {} };
    const { result } = renderHook(() => useDealAnalysis('residential', residentialInputs, nb));
    expect(result.current.results.blended).toBe(true);
  });

  it('returns commercial debt sizing + levered/unlevered IRR from the engine', () => {
    const { result } = renderHook(() => useDealAnalysis('commercial', commercialInputs, null));
    const r = result.current.results;
    expect(r.mode).toBe('commercial');
    expect(['LTV', 'DSCR', 'DebtYield']).toContain(r.bindingConstraint);
    expect(r.maxLoan).toBeGreaterThan(0);
    expect(r.leveredIRR).toBeTypeOf('number');
    expect(r.unleveredIRR).toBeTypeOf('number');
    expect(r.equityMultiple).toBeTypeOf('number');
    expect(r.pricePerUnit).toBeGreaterThan(0);
  });
});
