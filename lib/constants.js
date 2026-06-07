export const THRESHOLDS = Object.freeze({
  // Cash-on-Cash
  cocMin: 0.08,
  cocStrong: 0.12,
  // DSCR
  dscrFloor: 1.20,
  dscrStrong: 1.40,
  // Debt yield
  debtYieldMin: 0.10,
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
  seventyRuleArvPct: 0.70,
  // Exit cap convention
  exitCapBumpBps: 50,
  // Yield-on-cost spread vs going-in cap
  yieldOnCostSpreadBps: 100,
});

export const EXPENSE_DEFAULTS = Object.freeze({
  vacancy: { A: 0.04, B: 0.06, C: 0.09 },
  management: 0.10,
  maintenance: { new: 0.05, mid: 0.08, old: 0.10 },
  capex: { new: 0.05, mid: 0.07, old: 0.10 },
  rentGrowth: 0.025,
  expenseGrowth: 0.03,
  appreciation: 0.025,
  saleCost: 0.06,
});

export const CRE_THRESHOLDS = Object.freeze({
  multifamily: { minDSCR: 1.25, minDebtYield: 0.08, maxLTV: 0.75, oerLow: 0.35, oerHigh: 0.45 },
  retail:      { minDSCR: 1.40, minDebtYield: 0.10, maxLTV: 0.70, oerLow: 0.15, oerHigh: 0.30 },
  office:      { minDSCR: 1.45, minDebtYield: 0.12, maxLTV: 0.70, oerLow: 0.30, oerHigh: 0.40 },
  industrial:  { minDSCR: 1.30, minDebtYield: 0.09, maxLTV: 0.70, oerLow: 0.10, oerHigh: 0.25 },
});
