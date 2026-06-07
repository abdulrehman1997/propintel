import { analyzeResidential } from './residential.js';
import { annualDebtService } from './finance.js';
import { THRESHOLDS } from './constants.js';

const frac = (p) => p / 100;

export const analyzeBRRRR = (input) => {
  const {
    purchasePrice, rehabBudget = 0, arv,
    closingCostsBuyPct = 3, hardMoneyRate = 0, rehabMonths = 0, otherCarryAnnual = 0,
    refiLtv, refiRate, refiAmortYears = 30,
  } = input;

  const warnings = [];

  // NOI: reuse the residential income build-up (no duplicate logic).
  // downPaymentPct/interestRate/loanTermYears are NOI-irrelevant; pass safe placeholders.
  const ops = analyzeResidential({
    purchasePrice, repairCosts: rehabBudget,
    downPaymentPct: 0, interestRate: 0, loanTermYears: 30,
    ...input,
  });
  const noi = ops.noi;

  // All-in cost: purchase + rehab + buy closing + carry during rehab.
  const buyClosingCosts = purchasePrice * frac(closingCostsBuyPct);
  const financedDuringRehab = purchasePrice + rehabBudget;
  const interestCarry = financedDuringRehab * frac(hardMoneyRate) * (rehabMonths / 12);
  const flatCarry = otherCarryAnnual * (rehabMonths / 12);
  const carryCosts = interestCarry + flatCarry;
  const allInCost = purchasePrice + rehabBudget + buyClosingCosts + carryCosts;

  // Refinance.
  const refiLoan = arv * frac(refiLtv);
  const cashLeftInDeal = allInCost - refiLoan;
  const cashOut = refiLoan - allInCost;

  const refiAnnualDebtService = annualDebtService(refiLoan, frac(refiRate), refiAmortYears);
  const postRefiCashFlow = noi - refiAnnualDebtService;
  const postRefiCoC = cashLeftInDeal > 0 ? postRefiCashFlow / cashLeftInDeal : null;
  const infiniteReturn = cashLeftInDeal <= 0 && postRefiCashFlow > 0;

  // 70% rule sanity: max BRRRR offer = 0.70 * ARV - rehab.
  const maxOffer70 = THRESHOLDS.seventyRuleArvPct * arv - rehabBudget;
  if (purchasePrice > maxOffer70) warnings.push('Purchase price exceeds 70%-rule max offer (0.70*ARV - rehab)');
  if (postRefiCashFlow <= 0) warnings.push('Post-refi cash flow is non-positive');
  if (!infiniteReturn && cashLeftInDeal > 0 && postRefiCoC != null && postRefiCoC < THRESHOLDS.cocMin)
    warnings.push('Cash left in deal with post-refi CoC below 8%');

  return {
    noi,
    buyClosingCosts, carryCosts, allInCost,
    refiLoan, cashLeftInDeal, cashOut,
    refiAnnualDebtService, postRefiCashFlow, postRefiCoC,
    infiniteReturn, maxOffer70,
    warnings,
  };
};
