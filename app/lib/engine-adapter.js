// Engine adapter: the single bridge between the React UI and the modular
// pro-grade engine (lib/residential.js, lib/commercial.js, lib/scoring.js,
// lib/brrrr.js). The UI never touches lib/calculations.js (legacy) anymore.
//
// Every function here is pure and returns a flat, UI-friendly result object.
// Percentages are returned in human units (e.g. 6.5 means 6.5%) so the existing
// formatPercent helper renders them directly.

import { analyzeResidential, projectResidential } from '../../lib/residential.js';
import { analyzeCommercial, projectCommercial } from '../../lib/commercial.js';
import { compositeScore, redFlagGates, stressTests } from '../../lib/scoring.js';
import { analyzeBRRRR } from '../../lib/brrrr.js';
import { residentialInputSchema, commercialInputSchema } from '../../lib/schemas.js';

const pct = (frac) => (frac == null ? null : frac * 100);
const num = (v, d = 0) => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : d;
};

// ── Letter grade helper (kept consistent with scoring.js thresholds) ──
const gradeFor = (score) => {
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  if (score >= 35) return 'D';
  return 'F';
};

// ─────────────────────────────────────────────────────────────────────────────
// RESIDENTIAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Coerce raw UI inputs into the residential engine input shape.
 * appreciationPct / exitCapRate / saleCostPct / holdYears are now real controls.
 */
const toResidentialEngineInput = (inputs) => ({
  purchasePrice: num(inputs.purchasePrice),
  repairCosts: num(inputs.repairCosts),
  downPaymentPct: num(inputs.downPaymentPct),
  interestRate: num(inputs.interestRate),
  loanTermYears: num(inputs.loanTermYears, 30),
  annualPropertyTax: num(inputs.annualPropertyTax),
  annualInsurance: num(inputs.annualInsurance),
  monthlyHOA: num(inputs.monthlyHOA),
  monthlyRent: num(inputs.monthlyRent),
  vacancyPct: num(inputs.vacancyPct),
  managementPct: num(inputs.managementPct),
  maintenancePct: num(inputs.maintenancePct),
  capExPct: num(inputs.capExPct),
  rentGrowthPct: num(inputs.rentGrowthPct, 3),
  expenseGrowthPct: num(inputs.expenseGrowthPct, 3),
  appreciationPct: num(inputs.appreciationPct, 3),
  holdYears: num(inputs.holdYears, 5),
  saleCostPct: num(inputs.saleCostPct, 6),
  // exitCapRate is optional; only thread when > 0 so the engine can fall back to
  // appreciated-value terminal pricing for plain SFR deals.
  exitCapRate: num(inputs.exitCapRate) > 0 ? num(inputs.exitCapRate) : undefined,
});

export const analyzeResidentialDeal = (inputs) => {
  const eIn = toResidentialEngineInput(inputs);
  const base = analyzeResidential(eIn);
  const proj = projectResidential(eIn);

  const exitYear = proj.years[proj.years.length - 1];
  const exitValue = exitYear?.propertyValue ?? null;

  const scoreInput = {
    cashOnCash: base.cashOnCash,
    dscr: base.dscr,
    irr: proj.irr ?? 0,
    equityMultiple: proj.equityMultiple ?? 1,
    capRate: base.capRate,
    grm: base.grm,
    marketGrade: 'B',
    breakEvenOccupancy: base.breakEvenOccupancy,
    debtYield: base.debtYield,
    ageFactor: 0.5,
  };
  const scored = compositeScore(scoreInput);
  const flags = redFlagGates({
    dscr: base.dscr,
    annualCashFlow: base.annualCashFlow,
    breakEvenOccupancy: base.breakEvenOccupancy,
    cashOnCash: base.cashOnCash,
    debtYield: base.debtYield,
    hasAppreciationThesis: num(inputs.appreciationPct, 3) > 0,
    exitCapRate: eIn.exitCapRate != null ? eIn.exitCapRate / 100 : null,
    goingInCapRate: base.capRate,
  });

  return {
    mode: 'residential',
    // headline / scoring
    investmentScore: scored.score,
    investmentGrade: scored.grade,
    scoreComponents: scored.components,
    redFlags: flags,
    // cash flow
    monthlyCashFlow: base.annualCashFlow / 12,
    annualCashFlow: base.annualCashFlow,
    cashOnCash: pct(base.cashOnCash),
    annualROI: pct(base.cashOnCash),
    noi: base.noi,
    // valuation
    capRate: pct(base.capRate),
    GRM: base.grm,
    onePercentRule: base.onePercentRule * 100, // % of price; >=1 passes
    // financing / risk
    dscr: base.dscr,
    debtYield: pct(base.debtYield),
    breakEvenOccupancy: pct(base.breakEvenOccupancy),
    downPaymentDollar: base.downPayment,
    loanAmount: base.loanAmount,
    closingCosts: base.closingCosts,
    totalCashInvested: base.totalCashInvested,
    monthlyMortgage: base.monthlyPI,
    // return / exit
    irr: pct(proj.irr),
    equityMultiple: proj.equityMultiple,
    exitValue,
    exitCapRate: inputs.exitCapRate != null && num(inputs.exitCapRate) > 0 ? num(inputs.exitCapRate) : null,
    // chart helpers (score breakdown bars expect *Score keys)
    cocScore: scored.components.cashFlow,
    capScore: scored.components.valuation,
    grmScore: scored.components.valuation,
    onePercScore: scored.components.returns,
    warnings: base.warnings,
    projections: proj.years.map((y) => ({
      year: y.year,
      propertyValue: y.propertyValue,
      equity: y.equity,
      annualCashFlow: y.annualCashFlow,
    })),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// COMMERCIAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Coerce raw UI inputs into the commercial engine input shape.
 * Supports per-unit multifamily (units array) and per-SF retail/office/industrial.
 */
const toCommercialEngineInput = (inputs) => {
  const units = Array.isArray(inputs.units)
    ? inputs.units
        .map((u) => ({
          count: num(u.count, 1),
          marketRent: num(u.marketRent),
          inPlaceRent: num(u.inPlaceRent ?? u.marketRent),
        }))
        .filter((u) => u.marketRent > 0)
    : [];

  return {
    assetType: inputs.assetType || 'multifamily',
    purchasePrice: num(inputs.purchasePrice),
    rentableSqft: num(inputs.rentableSqft),
    units,
    leaseType: inputs.leaseType || 'gross',
    recoveryRatio: num(inputs.recoveryRatio) > 1 ? num(inputs.recoveryRatio) / 100 : num(inputs.recoveryRatio),
    vacancyPct: num(inputs.vacancyPct),
    creditLossPct: num(inputs.creditLossPct),
    otherIncomeAnnual: num(inputs.otherIncomeAnnual),
    opexAnnual: num(inputs.opexAnnual),
    goingInCapRate: num(inputs.goingInCapRate),
    exitCapRate: num(inputs.exitCapRate),
    maxLTV: num(inputs.maxLTV, 75),
    minDSCR: num(inputs.minDSCR, 1.25),
    minDebtYield: num(inputs.minDebtYield, 8),
    interestRate: num(inputs.interestRate),
    amortYears: num(inputs.amortYears, 30),
    interestOnly: !!inputs.interestOnly,
    holdYears: num(inputs.holdYears, 5),
    rentGrowthPct: num(inputs.rentGrowthPct, 3),
    expenseGrowthPct: num(inputs.expenseGrowthPct, 3),
    saleCostPct: num(inputs.saleCostPct, 2),
  };
};

export const analyzeCommercialDeal = (inputs) => {
  const eIn = toCommercialEngineInput(inputs);
  const base = analyzeCommercial(eIn);
  const proj = projectCommercial(eIn);

  // Commercial cash flows: BTCF year 1 = NOI - annual debt service.
  const annualCashFlow = base.noi - base.annualDebtService;
  const cashOnCash = base.equity > 0 ? annualCashFlow / base.equity : 0;

  const scored = compositeScore({
    cashOnCash,
    dscr: base.dscr,
    irr: proj.leveredIRR ?? 0,
    equityMultiple: proj.equityMultiple ?? 1,
    capRate: base.goingInCap,
    grm: 0, // CRE valued on cap rate, not GRM; grmPart clamps to a low score
    marketGrade: 'B',
    breakEvenOccupancy: base.breakEvenOccupancy,
    debtYield: base.debtYield,
    ageFactor: 0.5,
  });

  const flags = redFlagGates({
    dscr: base.dscr,
    annualCashFlow,
    breakEvenOccupancy: base.breakEvenOccupancy,
    cashOnCash,
    debtYield: base.debtYield,
    hasAppreciationThesis: true,
    exitCapRate: num(inputs.exitCapRate) / 100,
    goingInCapRate: num(inputs.goingInCapRate) / 100,
  });

  return {
    mode: 'commercial',
    assetType: base.assetType,
    investmentScore: scored.score,
    investmentGrade: scored.grade,
    scoreComponents: scored.components,
    redFlags: flags,
    // income stack
    gpr: base.gpr,
    gsr: base.gsr,
    lossToLease: base.lossToLease,
    egi: base.egi,
    opex: base.opex,
    noi: base.noi,
    oer: pct(base.oer),
    // valuation
    value: base.value,
    goingInCap: pct(base.goingInCap),
    capRate: pct(base.goingInCap),
    exitCapRate: num(inputs.exitCapRate),
    pricePerUnit: base.pricePerUnit,
    pricePerSF: base.pricePerSF,
    // debt sizing
    debt: base.debt,
    bindingConstraint: base.debt.bindingConstraint,
    maxLoan: base.debt.maxLoan,
    equity: base.equity,
    annualDebtService: base.annualDebtService,
    dscr: base.dscr,
    debtYield: pct(base.debtYield),
    breakEvenOccupancy: pct(base.breakEvenOccupancy),
    // returns
    monthlyCashFlow: annualCashFlow / 12,
    annualCashFlow,
    cashOnCash: pct(cashOnCash),
    annualROI: pct(cashOnCash),
    unleveredIRR: pct(proj.unleveredIRR),
    irr: pct(proj.leveredIRR),
    leveredIRR: pct(proj.leveredIRR),
    leverageAccretive: proj.leverageAccretive,
    equityMultiple: proj.equityMultiple,
    // chart helpers
    cocScore: scored.components.cashFlow,
    capScore: scored.components.valuation,
    grmScore: scored.components.riskCushion,
    onePercScore: scored.components.returns,
    warnings: base.warnings,
    // simple value/equity projection for the projections chart
    projections: proj.leveredCashFlows.slice(1).map((cf, i) => ({
      year: i + 1,
      propertyValue: base.value * Math.pow(1 + num(inputs.rentGrowthPct, 3) / 100, i),
      equity: base.equity,
      annualCashFlow: cf,
    })),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// SCORING / STRESS / SENSITIVITY (UI-facing)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run the stress-test battery for a residential deal. Each scenario re-runs the
 * residential engine with the scenario's shocks applied to the raw inputs.
 */
export const residentialStressTests = (inputs) => {
  const recompute = (shocks) => {
    const shocked = {
      ...inputs,
      monthlyRent: num(inputs.monthlyRent) * (shocks.rentMult ?? 1),
      vacancyPct: num(inputs.vacancyPct) + (shocks.vacancyAdd ?? 0) * 100,
      interestRate: num(inputs.interestRate) + (shocks.rateAdd ?? 0) * 100,
    };
    const eIn = toResidentialEngineInput(shocked);
    // opex shock: bump the four opex-driving expense lines proportionally.
    const opexMult = shocks.opexMult ?? 1;
    eIn.annualPropertyTax *= opexMult;
    eIn.annualInsurance *= opexMult;
    eIn.managementPct *= opexMult;
    eIn.maintenancePct *= opexMult;
    eIn.capExPct *= opexMult;
    const r = analyzeResidential(eIn);
    return {
      dscr: r.dscr,
      annualCashFlow: r.annualCashFlow,
      cashOnCash: r.cashOnCash,
      noi: r.noi,
    };
  };
  return stressTests(recompute);
};

/**
 * Cash-on-Cash compute fn for the SensitivityHeatmap (Rate × Exit Cap grid).
 * Returns CoC as a percentage number.
 */
export const residentialSensitivityCompute = (inp) => {
  const eIn = toResidentialEngineInput(inp);
  const r = analyzeResidential(eIn);
  return +(r.cashOnCash * 100).toFixed(2);
};

// ─────────────────────────────────────────────────────────────────────────────
// BRRRR
// ─────────────────────────────────────────────────────────────────────────────

export const analyzeBrrrrDeal = (inputs) => {
  const r = analyzeBRRRR({
    purchasePrice: num(inputs.purchasePrice),
    repairCosts: num(inputs.repairCosts ?? inputs.rehabBudget),
    rehabBudget: num(inputs.rehabBudget ?? inputs.repairCosts),
    arv: num(inputs.arv),
    closingCostsBuyPct: num(inputs.closingCostsBuyPct, 3),
    hardMoneyRate: num(inputs.hardMoneyRate),
    rehabMonths: num(inputs.rehabMonths),
    otherCarryAnnual: num(inputs.otherCarryAnnual),
    refiLtv: num(inputs.refiLtv, 75),
    refiRate: num(inputs.refiRate),
    refiAmortYears: num(inputs.refiAmortYears, 30),
    // NOI build-up reuses residential income/expense lines
    monthlyRent: num(inputs.monthlyRent),
    vacancyPct: num(inputs.vacancyPct),
    managementPct: num(inputs.managementPct),
    maintenancePct: num(inputs.maintenancePct),
    capExPct: num(inputs.capExPct),
    annualPropertyTax: num(inputs.annualPropertyTax),
    annualInsurance: num(inputs.annualInsurance),
    monthlyHOA: num(inputs.monthlyHOA),
  });
  return {
    ...r,
    postRefiCoCPct: r.postRefiCoC != null ? r.postRefiCoC * 100 : null,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION (engine zod schemas at the form boundary)
// ─────────────────────────────────────────────────────────────────────────────

const SCHEMAS = {
  residential: residentialInputSchema,
  commercial: commercialInputSchema,
};

/**
 * Validate raw UI inputs against the engine's zod schema for the active mode.
 * Returns { success, errors } where errors is keyed by field name for the form.
 */
export const validateEngineInput = (mode, inputs) => {
  const schema = SCHEMAS[mode];
  if (!schema) return { success: false, errors: { _: `Unknown mode: ${mode}` } };

  const candidate = mode === 'residential'
    ? toResidentialEngineInput(inputs)
    : toCommercialEngineInput(inputs);

  const result = schema.safeParse(candidate);
  if (result.success) return { success: true, errors: {} };

  const errors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] ?? '_';
    if (!errors[key]) errors[key] = issue.message;
  }
  return { success: false, errors };
};

export { gradeFor };
