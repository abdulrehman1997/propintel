import { describe, it, expect } from 'vitest';
import { compositeScore } from '../lib/scoring.js';

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
