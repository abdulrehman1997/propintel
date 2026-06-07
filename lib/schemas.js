import { z } from 'zod';

const pct = z.number().min(0).max(100);
const money = z.number().min(0);

export const residentialInputSchema = z.object({
  purchasePrice: money.positive(),
  repairCosts: money.default(0),
  downPaymentPct: pct,
  interestRate: z.number().min(0).max(30),
  loanTermYears: z.number().int().min(1).max(50),
  annualPropertyTax: money,
  annualInsurance: money,
  monthlyHOA: money.default(0),
  monthlyRent: money.positive(),
  vacancyPct: pct,
  managementPct: pct,
  maintenancePct: pct,
  capExPct: pct,
  rentGrowthPct: pct.default(3),
  expenseGrowthPct: pct.default(3),
  appreciationPct: pct.default(3),
  holdYears: z.number().int().min(1).max(40).default(5),
});

const unitSchema = z.object({
  count: z.number().int().positive().default(1),
  marketRent: z.number().positive(),
  inPlaceRent: z.number().positive(),
});

export const commercialInputSchema = z.object({
  assetType: z.enum(['multifamily', 'retail', 'office', 'industrial']),
  purchasePrice: money.positive(),
  rentableSqft: money.optional(),
  units: z.array(unitSchema).optional(),
  leaseType: z.enum(['NNN', 'gross', 'MG', 'absoluteNNN']).default('gross'),
  recoveryRatio: z.number().min(0).max(1).default(0),
  vacancyPct: pct,
  creditLossPct: pct.default(0),
  otherIncomeAnnual: money.default(0),
  opexAnnual: money,
  goingInCapRate: z.number().min(0).max(30),
  exitCapRate: z.number().min(0).max(30),
  maxLTV: pct,
  minDSCR: z.number().positive(),
  minDebtYield: pct,
  interestRate: z.number().min(0).max(30),
  amortYears: z.number().int().min(1).max(40),
  interestOnly: z.boolean().default(false),
  holdYears: z.number().int().min(1).max(40),
  rentGrowthPct: pct,
  expenseGrowthPct: pct,
  saleCostPct: pct.default(2),
});

export const validateInput = (schema, data) => {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, data: result.data, errors: [] };
  const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
  return { ok: false, data: null, errors };
};
