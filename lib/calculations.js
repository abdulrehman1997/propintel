export const calculateMetrics = (inputs) => {
  const {
    purchasePrice,
    repairCosts,
    downPaymentPct,
    interestRate,
    loanTermYears,
    annualPropertyTax,
    annualInsurance,
    monthlyHOA,
    monthlyRent,
    vacancyPct,
    managementPct,
    maintenancePct,
    capExPct
  } = inputs;

  // === PURCHASE & FINANCING ===
  const downPaymentDollar = purchasePrice * (downPaymentPct / 100);
  const loanAmount = Math.max(0, purchasePrice - downPaymentDollar);
  const closingCosts = purchasePrice * 0.03;
  const totalCashInvested = downPaymentDollar + closingCosts + repairCosts;

  // Monthly mortgage payment (P&I)
  const monthlyRate = interestRate / 100 / 12;
  const numPayments = loanTermYears * 12;
  const monthlyMortgage = monthlyRate > 0 
    ? (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) / (Math.pow(1 + monthlyRate, numPayments) - 1)
    : (loanAmount / numPayments);

  // === MONTHLY EXPENSES ===
  const monthlyTax = annualPropertyTax / 12;
  const monthlyInsurance = annualInsurance / 12;
  const monthlyManagement = monthlyRent * (managementPct / 100);
  const monthlyVacancy = monthlyRent * (vacancyPct / 100);
  const monthlyMaintenance = (purchasePrice * (maintenancePct / 100)) / 12;
  const monthlyCapEx = monthlyRent * (capExPct / 100);

  const totalMonthlyExpenses = monthlyMortgage + monthlyTax + monthlyInsurance + monthlyHOA + monthlyManagement + monthlyVacancy + monthlyMaintenance + monthlyCapEx;

  // === CASH FLOW ===
  const monthlyCashFlow = monthlyRent - totalMonthlyExpenses;
  const annualCashFlow = monthlyCashFlow * 12;

  // === KEY METRICS ===
  const annualNOI = (monthlyRent - monthlyVacancy - monthlyManagement - monthlyMaintenance - monthlyCapEx - monthlyTax - monthlyInsurance - monthlyHOA) * 12;
  
  const capRate = purchasePrice > 0 ? (annualNOI / purchasePrice) * 100 : 0;
  const GRM = (monthlyRent * 12) > 0 ? purchasePrice / (monthlyRent * 12) : 0;
  const cashOnCash = totalCashInvested > 0 ? (annualCashFlow / totalCashInvested) * 100 : 0;
  const onePercentRule = purchasePrice > 0 ? (monthlyRent / purchasePrice) * 100 : 0;
  const DSCR = (monthlyMortgage * 12) > 0 ? annualNOI / (monthlyMortgage * 12) : 0;

  // Equity buildup year 1
  const monthlyInterest = loanAmount * monthlyRate;
  const monthlyPrincipal = monthlyMortgage - monthlyInterest;
  const annualEquityBuildup = monthlyPrincipal * 12;

  // Appreciation
  const annualAppreciation = purchasePrice * 0.03;
  const annualTotalReturn = annualCashFlow + annualEquityBuildup + annualAppreciation;
  const annualROI = totalCashInvested > 0 ? (annualTotalReturn / totalCashInvested) * 100 : 0;

  // Break-even rent
  const fixedExpenses = monthlyMortgage + monthlyTax + monthlyInsurance + monthlyHOA + monthlyMaintenance;
  const variableRatio = (managementPct / 100) + (vacancyPct / 100) + (capExPct / 100);
  const breakEvenRent = variableRatio < 1 ? fixedExpenses / (1 - variableRatio) : 0;

  // === INVESTMENT SCORE (0-100) ===
  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

  const cocScore = clamp(
    cashOnCash < 0 ? 0 : 
    cashOnCash < 3 ? (cashOnCash / 3) * 40 : 
    cashOnCash < 6 ? 40 + ((cashOnCash - 3) / 3) * 30 : 
    cashOnCash < 10 ? 70 + ((cashOnCash - 6) / 4) * 30 : 100, 
    0, 100
  );

  const capScore = clamp(
    capRate < 2 ? 0 : 
    capRate < 4 ? ((capRate - 2) / 2) * 40 : 
    capRate < 6 ? 40 + ((capRate - 4) / 2) * 30 : 
    capRate < 8 ? 70 + ((capRate - 6) / 2) * 30 : 100, 
    0, 100
  );

  const grmScore = clamp(
    GRM > 25 ? 0 : 
    GRM > 20 ? ((25 - GRM) / 5) * 30 : 
    GRM > 15 ? 30 + ((20 - GRM) / 5) * 40 : 
    GRM > 10 ? 70 + ((15 - GRM) / 5) * 30 : 100, 
    0, 100
  );

  const onePercScore = clamp(
    onePercentRule < 0.5 ? 0 : 
    onePercentRule < 0.7 ? ((onePercentRule - 0.5) / 0.2) * 30 : 
    onePercentRule < 1.0 ? 30 + ((onePercentRule - 0.7) / 0.3) * 50 : 
    80 + Math.min((onePercentRule - 1.0) * 20, 20), 
    0, 100
  );

  const investmentScore = (cocScore * 0.40) + (capScore * 0.30) + (grmScore * 0.20) + (onePercScore * 0.10);
  
  let investmentGrade = 'F';
  if (investmentScore >= 80) investmentGrade = 'A';
  else if (investmentScore >= 65) investmentGrade = 'B';
  else if (investmentScore >= 50) investmentGrade = 'C';
  else if (investmentScore >= 35) investmentGrade = 'D';

  return {
    loanAmount,
    downPaymentDollar,
    closingCosts,
    totalCashInvested,
    monthlyMortgage,
    monthlyTax,
    monthlyInsurance,
    monthlyManagement,
    monthlyVacancy,
    monthlyMaintenance,
    monthlyCapEx,
    totalMonthlyExpenses,
    monthlyCashFlow,
    annualCashFlow,
    annualNOI,
    capRate,
    GRM,
    cashOnCash,
    onePercentRule,
    DSCR,
    annualEquityBuildup,
    annualROI,
    breakEvenRent,
    investmentScore,
    investmentGrade,
    cocScore,
    capScore,
    grmScore,
    onePercScore,
    totalInterest: (monthlyMortgage * numPayments) - loanAmount
  };
};

export const calculateProjections = (inputs, initialResults) => {
  const projections = [];
  let currentPropertyValue = inputs.purchasePrice;
  let currentRent = inputs.monthlyRent * 12;
  let currentExpenses = (initialResults.totalMonthlyExpenses - initialResults.monthlyMortgage) * 12;
  
  const monthlyRate = inputs.interestRate / 100 / 12;
  const numPayments = inputs.loanTermYears * 12;
  const monthlyMortgage = initialResults.monthlyMortgage;
  const loanAmount = initialResults.loanAmount;

  for (let y = 1; y <= 5; y++) {
    const propertyValue = inputs.purchasePrice * Math.pow(1.03, y);
    const annualRent = (inputs.monthlyRent * 12) * Math.pow(1.03, y - 1);
    const annualExpenses = ((initialResults.totalMonthlyExpenses - initialResults.monthlyMortgage) * 12) * Math.pow(1.03, y - 1);
    
    const p = y * 12;
    const n = numPayments;
    const r = monthlyRate;
    const loanBalance = r > 0 
      ? loanAmount * (Math.pow(1 + r, n) - Math.pow(1 + r, p)) / (Math.pow(1 + r, n) - 1)
      : 0;

    const equity = propertyValue - loanBalance;
    const annualCashFlow = annualRent - annualExpenses - (monthlyMortgage * 12);
    
    projections.push({
      year: y,
      propertyValue: propertyValue,
      equity: equity,
      annualCashFlow: annualCashFlow,
      totalReturn: annualCashFlow + (propertyValue - (inputs.purchasePrice * Math.pow(1.03, y-1)))
    });
  }
  return projections;
};
