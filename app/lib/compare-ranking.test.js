import { describe, it, expect } from 'vitest';
import { rankDeals, COMPARE_METRICS } from './compare-ranking';

const make = (over) => ({ name: 'D', mode: 'residential', inputs: {}, results: {
  monthlyCashFlow: 100, cashOnCash: 5, capRate: 5, irr: 9, equityMultiple: 1.5,
  dscr: 1.3, GRM: 12, investmentScore: 60, ...over,
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
  it('ranks on real engine metrics (IRR + equity multiple)', () => {
    const keys = COMPARE_METRICS.map((m) => m.key);
    expect(keys).toContain('irr');
    expect(keys).toContain('equityMultiple');
    const ranked = rankDeals([make({ irr: 5 }), make({ irr: 18 })]);
    expect(ranked.winners.irr).toBe(1);
  });
});
