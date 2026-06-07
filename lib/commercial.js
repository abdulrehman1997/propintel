import { annualDebtService, dscr, debtYield, sizeMaxLoan, irr, equityMultiple, terminalValue, netSaleProceeds, loanBalance } from './finance.js';
import { THRESHOLDS } from './constants.js';

const frac = (p) => p / 100;

export const analyzeCommercial = (input) => {
  const {
    assetType = 'multifamily', purchasePrice, rentableSqft = 0,
    units = [], leaseType = 'gross', recoveryRatio = 0,
    vacancyPct, creditLossPct = 0, otherIncomeAnnual = 0, opexAnnual = 0,
    goingInCapRate, exitCapRate, maxLTV, minDSCR, minDebtYield,
    interestRate, amortYears, interestOnly = false,
    holdYears, rentGrowthPct, expenseGrowthPct, saleCostPct = 2,
  } = input;

  const warnings = [];

  // Income stack
  const unitCount = units.reduce((s, u) => s + (u.count || 1), 0);
  const gpr = units.reduce((s, u) => s + (u.count || 1) * (u.marketRent || 0) * 12, 0);
  const gsr = units.reduce((s, u) => s + (u.count || 1) * (u.inPlaceRent || 0) * 12, 0);
  const lossToLease = gpr - gsr;
  const vacancyLoss = gsr * frac(vacancyPct);
  const creditLoss = gsr * frac(creditLossPct);
  const egi = gsr - vacancyLoss - creditLoss + otherIncomeAnnual;

  // Lease structure: NNN/absoluteNNN/MG recover OpEx via recoveryRatio (tenant reimburses).
  const recoverable = (leaseType === 'NNN' || leaseType === 'absoluteNNN' || leaseType === 'MG');
  const effectiveOpex = recoverable ? (opexAnnual * (1 - recoveryRatio)) : opexAnnual;
  const noi = egi - effectiveOpex;

  const value = goingInCapRate > 0 ? noi / frac(goingInCapRate) : purchasePrice;
  const oer = egi > 0 ? effectiveOpex / egi : 0;
  const goingInCap = purchasePrice > 0 ? noi / purchasePrice : 0;
  const pricePerUnit = unitCount > 0 ? purchasePrice / unitCount : 0;
  const pricePerSF = rentableSqft > 0 ? purchasePrice / rentableSqft : 0;

  const debt = sizeMaxLoan({
    noi, value, ltvBase: purchasePrice, maxLTV: frac(maxLTV), minDebtYield: frac(minDebtYield),
    minDSCR, rate: frac(interestRate), amortYears, interestOnly,
  });
  const ads = annualDebtService(debt.maxLoan, frac(interestRate), amortYears);
  const equity = purchasePrice - debt.maxLoan;
  const breakEvenOccupancy = gpr > 0 ? (effectiveOpex + ads) / gpr : 0;

  if (dscr(noi, ads) < minDSCR - 1e-6) warnings.push(`DSCR below ${minDSCR} at sized loan`);
  if (debtYield(noi, debt.maxLoan) < frac(minDebtYield)) warnings.push('Debt yield below minimum');
  if (frac(exitCapRate) <= frac(goingInCapRate)) warnings.push('Exit cap not above going-in cap (no haircut)');

  return {
    assetType, gpr, gsr, lossToLease, egi, opex: effectiveOpex, noi,
    value, oer, goingInCap, pricePerUnit, pricePerSF,
    debt, annualDebtService: ads, equity, breakEvenOccupancy,
    dscr: dscr(noi, ads), debtYield: debtYield(noi, debt.maxLoan),
    warnings,
    _projInputs: {
      noi, egi, effectiveOpex, debt, equity, exitCapRate, holdYears,
      rentGrowthPct, expenseGrowthPct, saleCostPct, interestRate, amortYears, purchasePrice,
    },
  };
};

export const projectCommercial = (input) => {
  const base = analyzeCommercial(input);
  const {
    noi, egi, effectiveOpex, debt, equity, exitCapRate,
    holdYears, rentGrowthPct, expenseGrowthPct, saleCostPct, interestRate, amortYears, purchasePrice,
  } = base._projInputs;

  const rg = frac(rentGrowthPct);
  const eg = frac(expenseGrowthPct);

  const unlevered = [-purchasePrice];
  const levered = [-equity];

  for (let y = 1; y <= holdYears; y++) {
    const yearNoi = noi * Math.pow(1 + rg, y - 1);
    const ads = base.annualDebtService;
    const btcf = yearNoi - ads;
    const remainingBal = loanBalance(debt.maxLoan, frac(interestRate), amortYears, y);

    if (y < holdYears) {
      unlevered.push(yearNoi);
      levered.push(btcf);
    } else {
      const exitNoi = noi * Math.pow(1 + rg, holdYears);
      const saleValue = terminalValue(exitNoi, frac(exitCapRate));
      const saleProceeds = netSaleProceeds(saleValue, frac(saleCostPct), remainingBal);
      unlevered.push(yearNoi + saleValue * (1 - frac(saleCostPct)));
      levered.push(btcf + saleProceeds);
    }
  }

  const unleveredIRR = irr(unlevered);
  const leveredIRR = irr(levered);
  const leverageAccretive = (leveredIRR != null && unleveredIRR != null) ? leveredIRR > unleveredIRR : false;

  const positiveDists = levered.slice(1).map((v) => Math.max(v, 0));
  const em = equityMultiple(positiveDists, equity);

  return {
    unleveredCashFlows: unlevered,
    leveredCashFlows: levered,
    unleveredIRR,
    leveredIRR,
    leverageAccretive,
    equityMultiple: em,
    equity,
  };
};
