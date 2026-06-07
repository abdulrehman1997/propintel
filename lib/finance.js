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
