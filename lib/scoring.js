import { THRESHOLDS } from "./constants.js";

const clamp = (v, lo = 0, hi = 100) => Math.min(Math.max(v, lo), hi);
const scale = (v, lo, hi) => clamp(((v - lo) / (hi - lo)) * 100);
const gradeMap = { A: 100, B: 75, C: 50 };

const WEIGHTS = {
  cashFlow: 0.25,
  returns: 0.2,
  valuation: 0.15,
  market: 0.2,
  riskCushion: 0.1,
  condition: 0.1,
};

export const compositeScore = (m) => {
  const cocPart = scale(m.cashOnCash, 0, THRESHOLDS.cocStrong);
  const dscrPart = scale(m.dscr, THRESHOLDS.dscrFloor, THRESHOLDS.dscrStrong);
  const cashFlow = (cocPart + dscrPart) / 2;

  const irrPart = scale(m.irr, 0, THRESHOLDS.irrTarget);
  const emPart = scale(m.equityMultiple, 1.0, THRESHOLDS.emTarget);
  const returns = (irrPart + emPart) / 2;

  const capPart = scale(m.capRate, 0.03, 0.09);
  const grmPart = scale(
    THRESHOLDS.grmExpensive - m.grm,
    0,
    THRESHOLDS.grmExpensive - THRESHOLDS.grmGood,
  );
  const valuation = (capPart + grmPart) / 2;

  const market = clamp(gradeMap[m.marketGrade] ?? 25);

  const beoPart = scale(
    THRESHOLDS.breakEvenOccMax - m.breakEvenOccupancy,
    0,
    0.25,
  );
  const dyPart = scale(m.debtYield, 0.06, 0.14);
  const riskCushion = (beoPart + dyPart) / 2;

  const condition = clamp((m.ageFactor ?? 0.5) * 100);

  const components = {
    cashFlow,
    returns,
    valuation,
    market,
    riskCushion,
    condition,
  };
  const score =
    cashFlow * WEIGHTS.cashFlow +
    returns * WEIGHTS.returns +
    valuation * WEIGHTS.valuation +
    market * WEIGHTS.market +
    riskCushion * WEIGHTS.riskCushion +
    condition * WEIGHTS.condition;

  let grade = "F";
  if (score >= 80) grade = "A";
  else if (score >= 65) grade = "B";
  else if (score >= 50) grade = "C";
  else if (score >= 35) grade = "D";

  return { score, grade, components };
};

export const redFlagGates = (m) => {
  const flags = [];
  if (m.dscr < THRESHOLDS.dscrFloor)
    flags.push({
      code: "DSCR_BELOW_FLOOR",
      severity: "CRITICAL",
      message: "DSCR below 1.20 at market rents",
    });
  if (m.annualCashFlow <= 0)
    flags.push({
      code: "NEGATIVE_CASH_FLOW",
      severity: "CRITICAL",
      message: "Year-1 cash flow non-positive",
    });
  if (m.breakEvenOccupancy > THRESHOLDS.breakEvenOccMax)
    flags.push({
      code: "HIGH_BREAKEVEN",
      severity: "HIGH",
      message: "Break-even occupancy above 85%",
    });
  if (m.cashOnCash < 0.05 && !m.hasAppreciationThesis)
    flags.push({
      code: "THIN_COC_NO_THESIS",
      severity: "HIGH",
      message: "CoC < 5% with no appreciation thesis",
    });
  if (m.debtYield > 0 && m.debtYield < THRESHOLDS.debtYieldMin)
    flags.push({
      code: "LOW_DEBT_YIELD",
      severity: "MEDIUM",
      message: "Debt yield below 10%",
    });
  if (
    m.exitCapRate != null &&
    m.goingInCapRate != null &&
    m.exitCapRate <= m.goingInCapRate
  )
    flags.push({
      code: "EXIT_CAP_NO_HAIRCUT",
      severity: "HIGH",
      message: "Exit cap not above going-in cap",
    });
  return flags;
};

const STRESS_SCENARIOS = [
  {
    scenario: "rent-5",
    shocks: {
      rentMult: 0.95,
      vacancyAdd: 0,
      opexMult: 1,
      rateAdd: 0,
      exitCapAdd: 0,
    },
  },
  {
    scenario: "rent-10",
    shocks: {
      rentMult: 0.9,
      vacancyAdd: 0,
      opexMult: 1,
      rateAdd: 0,
      exitCapAdd: 0,
    },
  },
  {
    scenario: "vacancy+5",
    shocks: {
      rentMult: 1,
      vacancyAdd: 0.05,
      opexMult: 1,
      rateAdd: 0,
      exitCapAdd: 0,
    },
  },
  {
    scenario: "opex+10",
    shocks: {
      rentMult: 1,
      vacancyAdd: 0,
      opexMult: 1.1,
      rateAdd: 0,
      exitCapAdd: 0,
    },
  },
  {
    scenario: "opex+20",
    shocks: {
      rentMult: 1,
      vacancyAdd: 0,
      opexMult: 1.2,
      rateAdd: 0,
      exitCapAdd: 0,
    },
  },
  {
    scenario: "rate+100bps",
    shocks: {
      rentMult: 1,
      vacancyAdd: 0,
      opexMult: 1,
      rateAdd: 0.01,
      exitCapAdd: 0,
    },
  },
  {
    scenario: "rate+200bps",
    shocks: {
      rentMult: 1,
      vacancyAdd: 0,
      opexMult: 1,
      rateAdd: 0.02,
      exitCapAdd: 0,
    },
  },
  {
    scenario: "exitCap+50bps",
    shocks: {
      rentMult: 1,
      vacancyAdd: 0,
      opexMult: 1,
      rateAdd: 0,
      exitCapAdd: 0.005,
    },
  },
  {
    scenario: "exitCap+100bps",
    shocks: {
      rentMult: 1,
      vacancyAdd: 0,
      opexMult: 1,
      rateAdd: 0,
      exitCapAdd: 0.01,
    },
  },
  {
    scenario: "combined-bad-case",
    shocks: {
      rentMult: 0.95,
      vacancyAdd: 0.05,
      opexMult: 1.1,
      rateAdd: 0.01,
      exitCapAdd: 0.005,
    },
  },
];

export const stressTests = (recompute) =>
  STRESS_SCENARIOS.map(({ scenario, shocks }) => {
    const result = recompute(shocks);
    return {
      scenario,
      ...result,
      dscrPass: result.dscr >= 1.0,
      cashFlowPass: result.annualCashFlow > 0,
    };
  });

export const sensitivityGrid = ({
  rowVar,
  rowValues,
  colVar,
  colValues,
  compute,
}) => {
  const cells = rowValues.map((rv) =>
    colValues.map((cv) => compute({ [rowVar]: rv, [colVar]: cv })),
  );
  return { rowVar, colVar, rowValues, colValues, cells };
};
