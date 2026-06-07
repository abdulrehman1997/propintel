import { describe, it, expect } from 'vitest';
import { monthlyPayment, annualDebtService, mortgageConstant, loanBalance } from '../lib/finance.js';

describe('amortization primitives', () => {
  it('computes monthly P&I for a 30yr fixed', () => {
    // $200,000 @ 6% / 30yr => ~$1199.10
    expect(monthlyPayment(200000, 0.06, 30)).toBeCloseTo(1199.10, 1);
  });
  it('falls back to straight-line when rate is 0', () => {
    expect(monthlyPayment(360000, 0, 30)).toBeCloseTo(1000, 6);
  });
  it('annual debt service is 12x monthly', () => {
    expect(annualDebtService(200000, 0.06, 30)).toBeCloseTo(1199.10 * 12, 0);
  });
  it('mortgage constant K = annual P&I per $1 (6.5% / 25yr ~ 0.08102)', () => {
    // Actual: 12*(r/(1-(1+r)^-n)) with r=0.065/12 => ~0.081025
    expect(mortgageConstant(0.065, 25)).toBeCloseTo(0.08102, 4);
  });
  it('interest-only mortgage constant equals the annual rate', () => {
    expect(mortgageConstant(0.065, 25, { interestOnly: true })).toBeCloseTo(0.065, 6);
  });
  it('remaining balance after 5yr on 200k/6%/30yr ~ 186,108', () => {
    expect(loanBalance(200000, 0.06, 30, 5)).toBeCloseTo(186108, -2);
  });
});
