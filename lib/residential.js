import { monthlyPayment, annualDebtService, dscr, debtYield, loanBalance, irr, equityMultiple, terminalValue, netSaleProceeds } from './finance.js';
import { THRESHOLDS } from './constants.js';

const frac = (p) => p / 100;

export const analyzeResidential = (input) => {
  const {
    purchasePrice, repairCosts = 0, downPaymentPct, interestRate, loanTermYears,
    annualPropertyTax, annualInsurance, monthlyHOA = 0,
    monthlyRent, vacancyPct, managementPct, maintenancePct, capExPct,
  } = input;

  const downPayment = purchasePrice * frac(downPaymentPct);
  const loanAmount = purchasePrice - downPayment;
  const closingCosts = purchasePrice * 0.03; // standard 3% closing cost assumption
  const totalCashInvested = downPayment + repairCosts + closingCosts;

  // Income build-up
  const gsi = monthlyRent * 12;
  const vacancyLoss = gsi * frac(vacancyPct);
  const egi = gsi - vacancyLoss;

  // Operating expenses (maintenance is % of property value/yr; mgmt/capex % of rent)
  const annualManagement = gsi * frac(managementPct);
  const annualMaintenance = purchasePrice * frac(maintenancePct);
  const annualCapEx = gsi * frac(capExPct);
  const annualHOA = monthlyHOA * 12;
  const opex = annualManagement + annualMaintenance + annualCapEx +
    annualPropertyTax + annualInsurance + annualHOA;

  const noi = egi - opex;

  // Mortgage
  const monthlyPI = monthlyPayment(loanAmount, frac(interestRate), loanTermYears);
  const ads = annualDebtService(loanAmount, frac(interestRate), loanTermYears);
  const annualCashFlow = noi - ads;

  // Ratios
  const capRate = purchasePrice > 0 ? noi / purchasePrice : 0;
  const grm = gsi > 0 ? purchasePrice / gsi : 0;
  const onePercentRule = purchasePrice > 0 ? monthlyRent / purchasePrice : 0;
  const cashOnCash = totalCashInvested > 0 ? annualCashFlow / totalCashInvested : 0;
  const dscrValue = dscr(noi, ads);
  const debtYieldValue = debtYield(noi, loanAmount);
  const breakEvenOccupancy = gsi > 0 ? (opex + ads) / gsi : 0;

  const warnings = [];
  if (dscrValue > 0 && dscrValue < THRESHOLDS.dscrFloor) warnings.push('DSCR below 1.20 floor');
  if (annualCashFlow <= 0) warnings.push('Year-1 cash flow is non-positive');
  if (breakEvenOccupancy > THRESHOLDS.breakEvenOccMax) warnings.push('Break-even occupancy above 85%');

  return {
    downPayment, loanAmount, closingCosts, totalCashInvested,
    gsi, egi, opex, noi,
    monthlyPI, annualDebtService: ads, annualCashFlow,
    capRate, grm, onePercentRule, cashOnCash,
    dscr: dscrValue, debtYield: debtYieldValue, breakEvenOccupancy,
    warnings,
  };
};

export const projectResidential = (input) => {
  const base = analyzeResidential(input);
  const {
    rentGrowthPct = 3, expenseGrowthPct = 3, appreciationPct = 3, holdYears = 5,
    purchasePrice, interestRate, loanTermYears,
  } = input;

  const rg = frac(rentGrowthPct);
  const eg = frac(expenseGrowthPct);
  const ag = frac(appreciationPct);

  const years = [];
  for (let y = 1; y <= holdYears; y++) {
    const propertyValue = purchasePrice * Math.pow(1 + ag, y);
    const annualRent = base.gsi * Math.pow(1 + rg, y - 1);
    const annualOpex = base.opex * Math.pow(1 + eg, y - 1);
    const annualNoi = annualRent * (1 - frac(input.vacancyPct)) - annualOpex;
    const ads = base.annualDebtService;
    const annualCashFlow = annualNoi - ads;
    const remainingBalance = loanBalance(base.loanAmount, frac(interestRate), loanTermYears, y);
    const equity = propertyValue - remainingBalance;
    years.push({ year: y, propertyValue, annualRent, annualOpex, annualNoi, annualCashFlow, remainingBalance, equity });
  }

  // Levered IRR: CF0 = -totalCashInvested; CF1..N = annual cash flows; CFN += net sale proceeds
  const exitYear = years[holdYears - 1];
  const saleProceeds = netSaleProceeds(exitYear.propertyValue, 0.06, exitYear.remainingBalance);
  const cashFlows = [-base.totalCashInvested, ...years.map((y, i) =>
    i < holdYears - 1 ? y.annualCashFlow : y.annualCashFlow + saleProceeds
  )];
  const leveredIRR = irr(cashFlows);
  const allDistributions = years.map((y, i) =>
    i < holdYears - 1 ? Math.max(y.annualCashFlow, 0) : Math.max(y.annualCashFlow, 0) + Math.max(saleProceeds, 0)
  );
  const em = equityMultiple(allDistributions, base.totalCashInvested);

  return {
    years,
    cashFlows,
    irr: leveredIRR,
    equityMultiple: em,
  };
};
