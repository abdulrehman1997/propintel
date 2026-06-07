import { describe, it, expect } from 'vitest';
import { compositeScore, redFlagGates, stressTests, sensitivityGrid } from '../lib/scoring.js';

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

// recompute: given a scenario shock object, return { dscr, annualCashFlow }
const recompute = ({ rentMult, vacancyAdd, opexMult, rateAdd, exitCapAdd }) => {
  const baseEgi = 1824000;
  const egi = baseEgi * rentMult * (1 - vacancyAdd);
  const opex = 400000 * opexMult;
  const noi = egi - opex;
  const ads = 1500000 * (1 + rateAdd);
  return { dscr: ads > 0 ? noi / ads : 0, annualCashFlow: noi - ads };
};

describe('stressTests', () => {
  const results = stressTests(recompute);
  it('runs all named scenarios including the combined bad case', () => {
    const names = results.map((r) => r.scenario);
    expect(names).toContain('rent-5');
    expect(names).toContain('rent-10');
    expect(names).toContain('vacancy+5');
    expect(names).toContain('opex+10');
    expect(names).toContain('opex+20');
    expect(names).toContain('rate+100bps');
    expect(names).toContain('rate+200bps');
    expect(names).toContain('exitCap+50bps');
    expect(names).toContain('exitCap+100bps');
    expect(names).toContain('combined-bad-case');
  });
  it('each scenario reports DSCR>=1.0 pass/fail and cash-flow-positive pass/fail', () => {
    for (const r of results) {
      expect(typeof r.dscrPass).toBe('boolean');
      expect(typeof r.cashFlowPass).toBe('boolean');
    }
  });
});

describe('sensitivityGrid', () => {
  const grid = sensitivityGrid({
    rowVar: 'exitCap', rowValues: [0.05, 0.055, 0.06],
    colVar: 'rentGrowth', colValues: [0.02, 0.03, 0.04],
    compute: ({ exitCap, rentGrowth }) => Math.round((rentGrowth / exitCap) * 1000) / 1000,
  });
  it('returns a matrix sized rows x cols with axis labels', () => {
    expect(grid.rowVar).toBe('exitCap');
    expect(grid.colVar).toBe('rentGrowth');
    expect(grid.cells).toHaveLength(3);
    expect(grid.cells[0]).toHaveLength(3);
  });
  it('computes each cell from the two varied inputs', () => {
    // row exitCap=0.05, col rentGrowth=0.03 => 0.6
    expect(grid.cells[0][1]).toBeCloseTo(0.6, 3);
  });
  it('preserves the axis value arrays', () => {
    expect(grid.rowValues).toEqual([0.05, 0.055, 0.06]);
    expect(grid.colValues).toEqual([0.02, 0.03, 0.04]);
  });
});
