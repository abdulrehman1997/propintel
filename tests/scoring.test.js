import { describe, it, expect } from 'vitest';
import { compositeScore, redFlagGates } from '../lib/scoring.js';

const strong = { cashOnCash: 0.12, dscr: 1.5, irr: 0.18, equityMultiple: 2.2,
  capRate: 0.07, grm: 7, marketGrade: 'A', breakEvenOccupancy: 0.65, debtYield: 0.12, ageFactor: 0.9 };
const weak = { cashOnCash: 0.02, dscr: 1.05, irr: 0.05, equityMultiple: 1.1,
  capRate: 0.03, grm: 14, marketGrade: 'C', breakEvenOccupancy: 0.92, debtYield: 0.07, ageFactor: 0.3 };

describe('compositeScore', () => {
  it('returns 0-100 with letter grade and component breakdown', () => {
    const s = compositeScore(strong);
    expect(s.score).toBeGreaterThanOrEqual(0);
    expect(s.score).toBeLessThanOrEqual(100);
    expect(['A','B','C','D','F']).toContain(s.grade);
    expect(s.components).toHaveProperty('cashFlow');
    expect(s.components).toHaveProperty('returns');
  });
  it('scores a strong deal higher than a weak one', () => {
    expect(compositeScore(strong).score).toBeGreaterThan(compositeScore(weak).score);
  });
  it('weights sum behaves: strong deal earns an A or B', () => {
    expect(['A','B']).toContain(compositeScore(strong).grade);
  });
  it('no single perfect metric forces an A on an otherwise failing deal', () => {
    const oneHot = { ...weak, irr: 0.40 };
    expect(compositeScore(oneHot).grade).not.toBe('A');
  });
});

describe('redFlagGates', () => {
  it('flags DSCR < 1.20, non-positive cash flow, break-even > 85%', () => {
    const flags = redFlagGates({
      dscr: 1.05, annualCashFlow: -500, breakEvenOccupancy: 0.9,
      cashOnCash: 0.03, hasAppreciationThesis: false,
      debtYield: 0.07, exitCapRate: 0.05, goingInCapRate: 0.05,
    });
    const labels = flags.map((f) => f.code);
    expect(labels).toContain('DSCR_BELOW_FLOOR');
    expect(labels).toContain('NEGATIVE_CASH_FLOW');
    expect(labels).toContain('HIGH_BREAKEVEN');
  });
  it('flags thin CoC with no appreciation thesis', () => {
    const flags = redFlagGates({
      dscr: 1.3, annualCashFlow: 100, breakEvenOccupancy: 0.7,
      cashOnCash: 0.04, hasAppreciationThesis: false,
      debtYield: 0.11, exitCapRate: 0.055, goingInCapRate: 0.05,
    });
    expect(flags.map((f) => f.code)).toContain('THIN_COC_NO_THESIS');
  });
  it('flags exit cap not above going-in (no haircut)', () => {
    const flags = redFlagGates({
      dscr: 1.3, annualCashFlow: 100, breakEvenOccupancy: 0.7,
      cashOnCash: 0.1, hasAppreciationThesis: true,
      debtYield: 0.11, exitCapRate: 0.05, goingInCapRate: 0.05,
    });
    expect(flags.map((f) => f.code)).toContain('EXIT_CAP_NO_HAIRCUT');
  });
  it('returns empty array for a clean deal', () => {
    expect(redFlagGates({
      dscr: 1.4, annualCashFlow: 5000, breakEvenOccupancy: 0.7,
      cashOnCash: 0.1, hasAppreciationThesis: true,
      debtYield: 0.12, exitCapRate: 0.06, goingInCapRate: 0.05,
    })).toEqual([]);
  });
});
