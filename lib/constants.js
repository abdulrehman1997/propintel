export const THRESHOLDS = Object.freeze({
  // Cash-on-Cash
  cocMin: 0.08,
  cocStrong: 0.12,
  // DSCR
  dscrFloor: 1.2,
  dscrStrong: 1.4,
  // Debt yield
  debtYieldMin: 0.1,
  // IRR / Equity Multiple
  irrTarget: 0.15,
  emTarget: 2.0,
  // GRM
  grmGood: 8,
  grmExpensive: 15,
  // Break-even occupancy
  breakEvenOccMax: 0.85,
  // Rules of thumb
  onePercMin: 0.01,
  twoPercStrong: 0.02,
  seventyRuleArvPct: 0.7,
  // Exit cap convention
  exitCapBumpBps: 50,
  // Yield-on-cost spread vs going-in cap
  yieldOnCostSpreadBps: 100,
});

export const EXPENSE_DEFAULTS = Object.freeze({
  vacancy: { A: 0.04, B: 0.06, C: 0.09 },
  management: 0.1,
  maintenance: { new: 0.05, mid: 0.08, old: 0.1 },
  capex: { new: 0.05, mid: 0.07, old: 0.1 },
  rentGrowth: 0.025,
  expenseGrowth: 0.03,
  appreciation: 0.025,
  saleCost: 0.06,
});

export const CRE_THRESHOLDS = Object.freeze({
  multifamily: {
    minDSCR: 1.25,
    minDebtYield: 0.08,
    maxLTV: 0.75,
    oerLow: 0.35,
    oerHigh: 0.45,
  },
  retail: {
    minDSCR: 1.4,
    minDebtYield: 0.1,
    maxLTV: 0.7,
    oerLow: 0.15,
    oerHigh: 0.3,
  },
  office: {
    minDSCR: 1.45,
    minDebtYield: 0.12,
    maxLTV: 0.7,
    oerLow: 0.3,
    oerHigh: 0.4,
  },
  industrial: {
    minDSCR: 1.3,
    minDebtYield: 0.09,
    maxLTV: 0.7,
    oerLow: 0.1,
    oerHigh: 0.25,
  },
});
