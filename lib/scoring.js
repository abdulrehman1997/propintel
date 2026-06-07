import { THRESHOLDS } from './constants.js';

const clamp = (v, lo = 0, hi = 100) => Math.min(Math.max(v, lo), hi);
const scale = (v, lo, hi) => clamp(((v - lo) / (hi - lo)) * 100);
const gradeMap = { A: 100, B: 75, C: 50 };

const WEIGHTS = {
  cashFlow: 0.25, returns: 0.20, valuation: 0.15,
  market: 0.20, riskCushion: 0.10, condition: 0.10,
};

export const compositeScore = (m) => {
  const cocPart = scale(m.cashOnCash, 0, THRESHOLDS.cocStrong);
  const dscrPart = scale(m.dscr, THRESHOLDS.dscrFloor, THRESHOLDS.dscrStrong);
  const cashFlow = (cocPart + dscrPart) / 2;

  const irrPart = scale(m.irr, 0, THRESHOLDS.irrTarget);
  const emPart = scale(m.equityMultiple, 1.0, THRESHOLDS.emTarget);
  const returns = (irrPart + emPart) / 2;

  const capPart = scale(m.capRate, 0.03, 0.09);
  const grmPart = scale(THRESHOLDS.grmExpensive - m.grm, 0, THRESHOLDS.grmExpensive - THRESHOLDS.grmGood);
  const valuation = (capPart + grmPart) / 2;

  const market = clamp(gradeMap[m.marketGrade] ?? 25);

  const beoPart = scale(THRESHOLDS.breakEvenOccMax - m.breakEvenOccupancy, 0, 0.25);
  const dyPart = scale(m.debtYield, 0.06, 0.14);
  const riskCushion = (beoPart + dyPart) / 2;

  const condition = clamp((m.ageFactor ?? 0.5) * 100);

  const components = { cashFlow, returns, valuation, market, riskCushion, condition };
  const score =
    cashFlow * WEIGHTS.cashFlow + returns * WEIGHTS.returns + valuation * WEIGHTS.valuation +
    market * WEIGHTS.market + riskCushion * WEIGHTS.riskCushion + condition * WEIGHTS.condition;

  let grade = 'F';
  if (score >= 80) grade = 'A';
  else if (score >= 65) grade = 'B';
  else if (score >= 50) grade = 'C';
  else if (score >= 35) grade = 'D';

  return { score, grade, components };
};
