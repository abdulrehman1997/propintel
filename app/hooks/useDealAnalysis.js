'use client';
import { useMemo } from 'react';
import { calculateMetrics, calculateProjections } from '../../lib/calculations';

/**
 * Runs the residential engine (calculateMetrics + calculateProjections) and
 * optionally blends a neighborhood score into the investmentScore.
 *
 * Commercial mode uses a simplified NOI-based analysis derived from the
 * CommercialInputs shape (annualGrossIncome / annualOperatingExpenses / purchasePrice).
 * The full lib/commercial.js engine requires a richer input shape (units array,
 * DSCR/LTV constraints) that the commercial form does not yet collect; a thin
 * adapter is used here so the hook never crashes.
 */

function analyzeCommercialSimple(inputs) {
  const {
    purchasePrice = 0,
    annualGrossIncome = 0,
    annualOperatingExpenses = 0,
    downPaymentPct = 30,
    interestRate = 7,
    loanTermYears = 25,
    goingInCapRate = 6,
    exitCapRate = 6.5,
  } = inputs;

  const noi = annualGrossIncome - annualOperatingExpenses;
  const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0;
  const downPayment = purchasePrice * (downPaymentPct / 100);
  const loanAmount = purchasePrice - downPayment;
  const r = interestRate / 100 / 12;
  const n = loanTermYears * 12;
  const monthlyPI = r > 0 ? loanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : loanAmount / n;
  const ads = monthlyPI * 12;
  const annualCashFlow = noi - ads;
  const cashOnCash = downPayment > 0 ? (annualCashFlow / downPayment) * 100 : 0;
  const GRM = annualGrossIncome > 0 ? purchasePrice / annualGrossIncome : 0;
  const score = Math.min(100, Math.max(0, capRate * 10 + cashOnCash * 5));

  return {
    monthlyCashFlow: annualCashFlow / 12,
    cashOnCash,
    capRate,
    GRM,
    annualROI: cashOnCash,
    investmentScore: score,
    investmentGrade: score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : score >= 35 ? 'D' : 'F',
    onePercentRule: purchasePrice > 0 ? (annualGrossIncome / 12) / purchasePrice : 0,
    downPaymentDollar: downPayment,
    noi,
    capRateRaw: capRate,
  };
}

function buildProjections(inputs, results) {
  const holdYears = inputs.holdYears ?? 5;
  const ag = (inputs.appreciationPct ?? 3) / 100;
  const rg = (inputs.rentGrowthPct ?? 3) / 100;
  const years = [];
  const { purchasePrice = 0, loanTermYears = 30, interestRate = 7, downPaymentPct = 20 } = inputs;
  const loanAmount = purchasePrice * (1 - downPaymentPct / 100);
  const r = interestRate / 100 / 12;
  const n = loanTermYears * 12;
  const monthlyPI = r > 0 ? loanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : loanAmount / n;
  const ads = monthlyPI * 12;
  const baseCashFlow = (results.monthlyCashFlow ?? 0) * 12;

  for (let y = 1; y <= holdYears; y++) {
    const propertyValue = purchasePrice * Math.pow(1 + ag, y);
    const annualCashFlow = baseCashFlow * Math.pow(1 + rg, y - 1);
    // Approximate remaining balance
    const paid = Math.min(y * ads * 0.3, loanAmount); // rough equity build
    const equity = propertyValue - (loanAmount - paid);
    years.push({ year: y, propertyValue, equity, annualCashFlow, totalReturn: annualCashFlow + (equity - (purchasePrice * (1 - downPaymentPct / 100))) });
  }
  return years;
}

export function useDealAnalysis(mode, inputs, neighborhoodData) {
  return useMemo(() => {
    if (mode === 'residential') {
      const results = calculateMetrics(inputs);
      const projections = calculateProjections(inputs);

      let finalResults = results;
      if (neighborhoodData?.neighborhoodScore != null) {
        const nbScore = neighborhoodData.neighborhoodScore;
        const blendedScore = results.investmentScore * 0.7 + nbScore * 0.3;
        const grade = blendedScore >= 80 ? 'A' : blendedScore >= 65 ? 'B' : blendedScore >= 50 ? 'C' : blendedScore >= 35 ? 'D' : 'F';
        finalResults = { ...results, investmentScore: blendedScore, investmentGrade: grade, blended: true };
      }

      return { results: finalResults, projections };
    }

    // Commercial mode
    const results = analyzeCommercialSimple(inputs);
    const projections = buildProjections(inputs, results);
    return { results, projections };
  }, [mode, inputs, neighborhoodData]);
}
