// Compatibility shim: legacy callers import from lib/calculations.js.
// New engine lives in lib/residential.js + lib/finance.js. Map old API onto new.
import { analyzeResidential, projectResidential } from "./residential.js";
import { compositeScore } from "./scoring.js";

export const calculateMetrics = (inputs) => {
  const r = analyzeResidential(inputs);
  const s = compositeScore({
    cashOnCash: r.cashOnCash,
    dscr: r.dscr,
    irr: 0,
    equityMultiple: 1,
    capRate: r.capRate,
    grm: r.grm,
    marketGrade: "B",
    breakEvenOccupancy: r.breakEvenOccupancy,
    debtYield: r.debtYield,
    ageFactor: 0.5,
  });
  return {
    loanAmount: r.loanAmount,
    downPaymentDollar: r.downPayment,
    closingCosts: r.closingCosts,
    totalCashInvested: r.totalCashInvested,
    monthlyMortgage: r.monthlyPI,
    annualNOI: r.noi,
    capRate: r.capRate * 100,
    GRM: r.grm,
    cashOnCash: r.cashOnCash * 100,
    onePercentRule: r.onePercentRule * 100,
    DSCR: r.dscr,
    annualCashFlow: r.annualCashFlow,
    investmentScore: s.score,
    investmentGrade: s.grade,
  };
};

// Second arg (initialResults) accepted for backward compat but ignored —
// projectResidential recomputes from inputs.
export const calculateProjections = (inputs, _initialResults) =>
  projectResidential(inputs).years;
