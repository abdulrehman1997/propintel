import {
  monthlyPayment,
  annualDebtService,
  dscr,
  debtYield,
  loanBalance,
  irr,
  equityMultiple,
  terminalValue,
  netSaleProceeds,
} from "./finance.js";
import { THRESHOLDS } from "./constants.js";

const frac = (p) => p / 100;

export const analyzeResidential = (input) => {
  const {
    purchasePrice,
    repairCosts = 0,
    downPaymentPct,
    interestRate,
    loanTermYears,
    annualPropertyTax,
    annualInsurance,
    monthlyHOA = 0,
    monthlyRent,
    vacancyPct,
    managementPct,
    maintenancePct,
    capExPct,
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
  const opex =
    annualManagement +
    annualMaintenance +
    annualCapEx +
    annualPropertyTax +
    annualInsurance +
    annualHOA;

  const noi = egi - opex;

  // Mortgage
  const monthlyPI = monthlyPayment(
    loanAmount,
    frac(interestRate),
    loanTermYears,
  );
  const ads = annualDebtService(loanAmount, frac(interestRate), loanTermYears);
  const annualCashFlow = noi - ads;

  // Ratios
  const capRate = purchasePrice > 0 ? noi / purchasePrice : 0;
  const grm = gsi > 0 ? purchasePrice / gsi : 0;
  const onePercentRule = purchasePrice > 0 ? monthlyRent / purchasePrice : 0;
  const cashOnCash =
    totalCashInvested > 0 ? annualCashFlow / totalCashInvested : 0;
  const dscrValue = dscr(noi, ads);
  const debtYieldValue = debtYield(noi, loanAmount);
  const breakEvenOccupancy = gsi > 0 ? (opex + ads) / gsi : 0;

  const warnings = [];
  if (dscrValue > 0 && dscrValue < THRESHOLDS.dscrFloor)
    warnings.push("DSCR below 1.20 floor");
  if (annualCashFlow <= 0) warnings.push("Year-1 cash flow is non-positive");
  if (breakEvenOccupancy > THRESHOLDS.breakEvenOccMax)
    warnings.push("Break-even occupancy above 85%");

  return {
    downPayment,
    loanAmount,
    closingCosts,
    totalCashInvested,
    gsi,
    egi,
    opex,
    noi,
    monthlyPI,
    annualDebtService: ads,
    annualCashFlow,
    capRate,
    grm,
    onePercentRule,
    cashOnCash,
    dscr: dscrValue,
    debtYield: debtYieldValue,
    breakEvenOccupancy,
    warnings,
  };
};

export const projectResidential = (input) => {
  const base = analyzeResidential(input);
  const {
    rentGrowthPct = 3,
    expenseGrowthPct = 3,
    appreciationPct = 3,
    holdYears = 5,
    purchasePrice,
    interestRate,
    loanTermYears,
    goingInCapRate,
    saleCostPct,
  } = input;

  // Exit cap: use provided value; if absent and goingInCapRate is known, default to going-in + 50 bps
  // (per spec convention). If neither is provided, exitCapRate stays null and we fall back to
  // appreciated property value (SFR deals where no cap rate is supplied).
  const resolvedExitCapRate =
    input.exitCapRate != null
      ? frac(input.exitCapRate)
      : goingInCapRate != null
        ? frac(goingInCapRate) + 0.005
        : null;

  // Sale cost: threaded from input, default 6% if absent.
  const saleCost = saleCostPct != null ? frac(saleCostPct) : 0.06;

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
    const remainingBalance = loanBalance(
      base.loanAmount,
      frac(interestRate),
      loanTermYears,
      y,
    );
    const equity = propertyValue - remainingBalance;
    years.push({
      year: y,
      propertyValue,
      annualRent,
      annualOpex,
      annualNoi,
      annualCashFlow,
      remainingBalance,
      equity,
    });
  }

  // Terminal value: NOI_(year N+1) / exitCapRate (spec: Terminal Value = NOI_{N+1} / exitCapRate).
  // If no valid exit cap can be resolved (neither exitCapRate nor goingInCapRate provided),
  // fall back to appreciated property value so legacy SFR calls still work correctly.
  const exitYear = years[holdYears - 1];
  const nextYearNoi = exitYear.annualNoi * (1 + rg);
  const saleValue =
    resolvedExitCapRate != null && resolvedExitCapRate > 0
      ? terminalValue(nextYearNoi, resolvedExitCapRate)
      : exitYear.propertyValue;

  // Net sale proceeds: terminal value net of sale costs and remaining loan balance.
  // Floor at 0: the equity holder's distribution from a sale cannot be negative —
  // if proceeds fail to cover the loan, the shortfall is the lender's loss, not an
  // extra equity contribution. Without this floor, an aggressive exit cap pushes the
  // final cash flow negative, which (a) eliminates the sign change so irr() returns
  // null and (b) drives equity multiple below 0 (both mathematically wrong).
  const saleProceeds = Math.max(
    0,
    netSaleProceeds(saleValue, saleCost, exitYear.remainingBalance),
  );

  // Levered IRR: CF0 = -totalCashInvested; CF1..N = annual cash flows; CFN += net sale proceeds.
  const cashFlows = [
    -base.totalCashInvested,
    ...years.map((y, i) =>
      i < holdYears - 1 ? y.annualCashFlow : y.annualCashFlow + saleProceeds,
    ),
  ];
  const leveredIRR = irr(cashFlows);

  // Equity multiple: use the SAME raw distribution stream as IRR (no per-distribution floor).
  const em = equityMultiple(cashFlows.slice(1), base.totalCashInvested);

  return {
    years,
    cashFlows,
    irr: leveredIRR,
    equityMultiple: em,
    // Terminal sale value actually used in the IRR/EM math. When an exit cap is
    // supplied this is the cap-based value (forwardNOI / exitCap); otherwise it is
    // the appreciated property value. Exposed so the UI's "Exit Value" tile reflects
    // the same number the returns math uses, instead of contradicting it.
    saleValue,
    netSaleProceeds: saleProceeds,
  };
};
