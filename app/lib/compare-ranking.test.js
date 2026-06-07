import { describe, it, expect } from 'vitest';
import { rankDeals, COMPARE_METRICS } from './compare-ranking';

const make = (over) => ({ name: 'D', mode: 'residential', inputs: {}, results: {
  monthlyCashFlow: 100, cashOnCash: 5, capRate: 5, annualROI: 8, GRM: 12, investmentScore: 60, ...over,
}});

describe('rankDeals', () => {
  it('flags the higher cash flow as winner for that metric', () => {
    const ranked = rankDeals([make({ monthlyCashFlow: 400 }), make({ monthlyCashFlow: 100 })]);
    expect(ranked.winners.monthlyCashFlow).toBe(0);
  });
  it('treats GRM as lower-is-better', () => {
    const ranked = rankDeals([make({ GRM: 18 }), make({ GRM: 10 })]);
    expect(ranked.winners.GRM).toBe(1);
  });
  it('orders rows by descending investmentScore', () => {
    const ranked = rankDeals([make({ investmentScore: 40 }), make({ investmentScore: 90 })]);
    expect(ranked.ordered[0].results.investmentScore).toBe(90);
  });
  it('exposes the metric list for table headers', () => {
    expect(COMPARE_METRICS.map((m) => m.key)).toContain('capRate');
  });
});
