export const monthlyPayment = (loan, annualRate, amortYears) => {
  if (loan <= 0) return 0;
  const n = amortYears * 12;
  if (n <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return loan / n;
  return (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};

export const annualDebtService = (loan, annualRate, amortYears) =>
  monthlyPayment(loan, annualRate, amortYears) * 12;

export const mortgageConstant = (annualRate, amortYears, { interestOnly = false } = {}) => {
  if (interestOnly) return annualRate;
  const r = annualRate / 12;
  const n = amortYears * 12;
  if (r === 0) return n > 0 ? 12 / n : 0;
  return 12 * (r / (1 - Math.pow(1 + r, -n)));
};

export const loanBalance = (loan, annualRate, amortYears, yearsElapsed) => {
  if (loan <= 0) return 0;
  const n = amortYears * 12;
  const p = Math.min(yearsElapsed * 12, n);
  const r = annualRate / 12;
  if (r === 0) return loan * (1 - p / n);
  return loan * (Math.pow(1 + r, n) - Math.pow(1 + r, p)) / (Math.pow(1 + r, n) - 1);
};

export const npv = (rate, cashFlows) =>
  cashFlows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0);

const hasSignChange = (cf) =>
  cf.some((v) => v > 0) && cf.some((v) => v < 0);

export const irr = (cashFlows, { guess = 0.1, tol = 1e-7, maxIter = 100 } = {}) => {
  if (!Array.isArray(cashFlows) || cashFlows.length < 2) return null;
  if (!hasSignChange(cashFlows)) return null;
  // Newton-Raphson
  let rate = guess;
  for (let i = 0; i < maxIter; i++) {
    let f = 0, df = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      const denom = Math.pow(1 + rate, t);
      f += cashFlows[t] / denom;
      if (t > 0) df += (-t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
    }
    if (Math.abs(f) < tol) return rate;
    if (df === 0) break;
    const next = rate - f / df;
    if (!Number.isFinite(next) || next <= -1) break;
    rate = next;
  }
  // Bisection fallback on [-0.9999, 10]
  let lo = -0.9999, hi = 10;
  let flo = npv(lo, cashFlows), fhi = npv(hi, cashFlows);
  if (flo * fhi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fmid = npv(mid, cashFlows);
    if (Math.abs(fmid) < tol) return mid;
    if (flo * fmid < 0) { hi = mid; fhi = fmid; }
    else { lo = mid; flo = fmid; }
  }
  return (lo + hi) / 2;
};

export const dscr = (noi, annualDebtServiceAmt) =>
  annualDebtServiceAmt > 0 ? noi / annualDebtServiceAmt : 0;

export const debtYield = (noi, loanAmount) =>
  loanAmount > 0 ? noi / loanAmount : 0;

export const sizeMaxLoan = ({ noi, value, maxLTV, minDebtYield, minDSCR, rate, amortYears, interestOnly = false }) => {
  const K = mortgageConstant(rate, amortYears, { interestOnly });
  const loanLTV = maxLTV * value;
  const loanDebtYield = minDebtYield > 0 ? noi / minDebtYield : Infinity;
  const loanDSCR = (minDSCR > 0 && K > 0) ? noi / (minDSCR * K) : Infinity;
  const candidates = [
    { label: 'LTV', amount: loanLTV },
    { label: 'DebtYield', amount: loanDebtYield },
    { label: 'DSCR', amount: loanDSCR },
  ];
  const binding = candidates.reduce((min, c) => c.amount < min.amount ? c : min, candidates[0]);
  return {
    loanLTV,
    loanDebtYield,
    loanDSCR,
    maxLoan: binding.amount,
    bindingConstraint: binding.label,
    mortgageConstant: K,
  };
};

export const terminalValue = (forwardNOI, exitCapRate) =>
  exitCapRate > 0 ? forwardNOI / exitCapRate : 0;

export const netSaleProceeds = (saleValue, saleCostPct, outstandingLoanBalance) =>
  saleValue * (1 - saleCostPct) - outstandingLoanBalance;

export const equityMultiple = (distributions, equityInvested) =>
  equityInvested > 0 ? distributions.reduce((a, b) => a + b, 0) / equityInvested : 0;
