import { z } from 'zod';

const pct = (label) =>
  z.number({ invalid_type_error: `${label} must be a number` }).min(0).max(100);

export const residentialSchema = z.object({
  purchasePrice: z.number().positive('Purchase price must be greater than 0'),
  repairCosts: z.number().min(0).default(0),
  downPaymentPct: pct('Down payment'),
  interestRate: z.number().min(0, 'Interest rate must be 0 or more').max(30),
  loanTermYears: z.number().int().positive(),
  annualPropertyTax: z.number().min(0),
  annualInsurance: z.number().min(0),
  monthlyHOA: z.number().min(0).default(0),
  monthlyRent: z.number().positive('Monthly rent must be greater than 0'),
  vacancyPct: pct('Vacancy'),
  managementPct: pct('Management fee'),
  maintenancePct: pct('Maintenance'),
  capExPct: pct('CapEx'),
  zipCode: z.string().regex(/^\d{5}$/, 'Zip code must be 5 digits').or(z.literal('')).default(''),
  bedrooms: z.number().int().min(0).max(6).default(3),
});

export const commercialSchema = z.object({
  purchasePrice: z.number().positive('Purchase price must be greater than 0'),
  squareFeet: z.number().positive('Square feet must be greater than 0'),
  units: z.number().int().min(1, 'Units must be at least 1').default(1),
  annualGrossIncome: z.number().positive('Annual gross income must be greater than 0'),
  annualOperatingExpenses: z.number().min(0).default(0),
  downPaymentPct: pct('Down payment'),
  interestRate: z.number().min(0).max(30),
  loanTermYears: z.number().int().positive(),
  goingInCapRate: z.number().min(0).max(30),
  exitCapRate: z.number().min(0).max(30),
});

const SCHEMAS = { residential: residentialSchema, commercial: commercialSchema };

export function validateDeal(mode, inputs) {
  const schema = SCHEMAS[mode];
  if (!schema) return { success: false, data: null, errors: { _: `Unknown mode: ${mode}` } };
  const result = schema.safeParse(inputs);
  if (result.success) return { success: true, data: result.data, errors: {} };
  const errors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return { success: false, data: null, errors };
}
