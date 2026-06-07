import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDealAnalysis } from './useDealAnalysis';

const residentialInputs = {
  purchasePrice: 350000, repairCosts: 0, downPaymentPct: 20, interestRate: 7,
  loanTermYears: 30, annualPropertyTax: 4200, annualInsurance: 1800, monthlyHOA: 0,
  monthlyRent: 2200, vacancyPct: 5, managementPct: 10, maintenancePct: 1, capExPct: 5,
  zipCode: '', bedrooms: 3,
};

describe('useDealAnalysis', () => {
  it('returns engine results + projections for residential', () => {
    const { result } = renderHook(() => useDealAnalysis('residential', residentialInputs, null));
    expect(result.current.results.capRate).toBeTypeOf('number');
    expect(result.current.projections).toHaveLength(5);
  });
  it('blends neighborhood score when provided', () => {
    const nb = { neighborhoodScore: 90, scoreBreakdown: {} };
    const { result } = renderHook(() => useDealAnalysis('residential', residentialInputs, nb));
    expect(result.current.results.blended).toBe(true);
  });
});
