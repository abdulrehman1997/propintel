'use client';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { formatCurrency, formatPercent } from '../../lib/format';
import { getScoreColor } from '../../lib/score-color';
import { MetricCard } from '../ui/MetricCard';
import { Tooltip } from '../ui/Tooltip';

const GRADE_LABELS = {
  A: 'Strong deal — excellent cash flow and returns',
  B: 'Good deal — solid fundamentals',
  C: 'Marginal deal — thin margins, review assumptions',
  D: 'Weak deal — negative or near-zero returns',
  F: 'Avoid — this deal loses money',
};

const SEVERITY_STYLE = {
  CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200',
  HIGH: 'bg-amber-50 text-amber-700 border-amber-200',
  MEDIUM: 'bg-yellow-50 text-yellow-700 border-yellow-200',
};

const fmtX = (v) => (v == null || Number.isNaN(v) ? 'N/A' : `${Number(v).toFixed(2)}x`);
const fmtNum = (v, d = 2) => (v == null || Number.isNaN(v) ? 'N/A' : Number(v).toFixed(d));

const RedFlags = ({ flags }) => {
  if (!flags || flags.length === 0) return null;
  return (
    <div className="px-8 pb-6 space-y-1.5">
      <h4 className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">Red-Flag Gates</h4>
      {flags.map((f) => (
        <div
          key={f.code}
          className={cn('text-xs font-medium border rounded-lg px-3 py-2 flex items-center gap-2', SEVERITY_STYLE[f.severity] ?? SEVERITY_STYLE.MEDIUM)}
        >
          <span className="font-bold">{f.severity}</span>
          <span>{f.message}</span>
        </div>
      ))}
    </div>
  );
};

const ResidentialMetrics = ({ r }) => (
  <div className="p-8 grid grid-cols-2 md:grid-cols-3 gap-4">
    <MetricCard label="Monthly Cash Flow" value={formatCurrency(r.monthlyCashFlow)} benchmark={{ green: 200, red: 0 }} />
    <MetricCard label="CoC Return" value={formatPercent(r.cashOnCash)} benchmark={{ green: 6, red: 0 }} />
    <MetricCard label="Cap Rate" value={formatPercent(r.capRate)} benchmark={{ green: 5, red: 3 }} />
    <MetricCard label="IRR" value={formatPercent(r.irr)} benchmark={{ green: 12, red: 0 }} tooltip="Levered internal rate of return over the hold period." />
    <MetricCard label="Equity Multiple" value={fmtX(r.equityMultiple)} benchmark={{ green: 1.8, red: 1 }} tooltip="Total distributions ÷ equity invested." />
    <MetricCard label="DSCR" value={fmtNum(r.dscr)} benchmark={{ green: 1.25, red: 1 }} tooltip="NOI ÷ annual debt service." />
    <MetricCard label="Debt Yield" value={formatPercent(r.debtYield)} benchmark={{ green: 10, red: 8 }} tooltip="NOI ÷ loan amount." />
    <MetricCard label="GRM" value={r.GRM != null ? r.GRM.toFixed(1) : 'N/A'} benchmark={{ green: -12, red: -20 }} />
    <MetricCard label="1% Rule" value={r.onePercentRule >= 1 ? '✅ PASS' : '❌ FAIL'} benchmark={{ green: 1.0, red: 0.7 }} />
    <MetricCard label="Exit Value" value={formatCurrency(r.exitValue)} tooltip="Projected terminal sale value at end of hold." />
    {r.exitCapRate != null && (
      <MetricCard label="Exit Cap Rate" value={formatPercent(r.exitCapRate)} />
    )}
    <MetricCard label="Annual ROI" value={formatPercent(r.annualROI)} benchmark={{ green: 8, red: 2 }} />
  </div>
);

const ASSET_LABELS = { multifamily: 'units', retail: 'SF', office: 'SF', industrial: 'SF' };

const CommercialMetrics = ({ r }) => {
  const perKey = ASSET_LABELS[r.assetType] === 'units' ? 'pricePerUnit' : 'pricePerSF';
  const perLabel = ASSET_LABELS[r.assetType] === 'units' ? 'Price / Unit' : 'Price / SF';
  return (
    <>
      <div className="p-8 pb-0 grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard label="NOI" value={formatCurrency(r.noi)} />
        <MetricCard label="Going-In Cap" value={formatPercent(r.goingInCap)} benchmark={{ green: 6, red: 4 }} />
        <MetricCard label="Exit Cap" value={formatPercent(r.exitCapRate)} />
        <MetricCard label="OER" value={formatPercent(r.oer)} tooltip="Operating expense ratio (effective opex ÷ EGI)." />
        <MetricCard label={perLabel} value={formatCurrency(r[perKey])} />
        <MetricCard label="Implied Value" value={formatCurrency(r.value)} tooltip="NOI ÷ going-in cap rate." />
      </div>
      <div className="px-8 pt-4 pb-0">
        <h4 className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3">Debt Sizing</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricCard label="Max Loan" value={formatCurrency(r.maxLoan)} />
          <MetricCard
            label="Binding Constraint"
            value={r.bindingConstraint}
            tooltip="MIN of LTV, DSCR, and debt-yield sized loans."
          />
          <MetricCard label="Equity Required" value={formatCurrency(r.equity)} />
          <MetricCard label="DSCR" value={fmtNum(r.dscr)} benchmark={{ green: 1.3, red: 1 }} />
          <MetricCard label="Debt Yield" value={formatPercent(r.debtYield)} benchmark={{ green: 10, red: 8 }} />
          <MetricCard label="Annual Debt Service" value={formatCurrency(r.annualDebtService)} />
        </div>
      </div>
      <div className="p-8 grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard label="Levered IRR" value={formatPercent(r.leveredIRR)} benchmark={{ green: 14, red: 0 }} />
        <MetricCard label="Unlevered IRR" value={formatPercent(r.unleveredIRR)} benchmark={{ green: 8, red: 0 }} />
        <MetricCard label="Equity Multiple" value={fmtX(r.equityMultiple)} benchmark={{ green: 1.8, red: 1 }} />
        <MetricCard label="CoC Return" value={formatPercent(r.cashOnCash)} benchmark={{ green: 8, red: 0 }} />
        <MetricCard
          label="Leverage"
          value={r.leverageAccretive ? '✅ Accretive' : '⚠️ Dilutive'}
          tooltip="Levered IRR vs unlevered IRR."
        />
        <MetricCard label="Break-Even Occ." value={formatPercent(r.breakEvenOccupancy)} benchmark={{ green: -85, red: -95 }} />
      </div>
    </>
  );
};

export const DealResults = ({ results }) => {
  if (!results) return null;
  const { investmentGrade, investmentScore, blended, redFlags } = results;

  return (
    <>
      <div className="p-8 text-center border-b border-slate-50 bg-slate-50/50">
        <div className="flex flex-col items-center">
          <motion.div
            key={investmentGrade}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              'w-24 h-24 rounded-full flex items-center justify-center text-5xl font-black mb-4 shadow-lg border-4',
              getScoreColor(investmentScore),
            )}
          >
            {investmentGrade}
          </motion.div>
          <div className="text-2xl font-bold text-slate-800 mb-1 flex items-center gap-2">
            Score: {Math.round(investmentScore)} / 100
            {blended && <Tooltip text="Score includes neighborhood context factors (income, vacancy, employment)." />}
          </div>
          <div className="text-slate-500 font-medium">
            {GRADE_LABELS[investmentGrade] ?? ''}
          </div>
        </div>
      </div>

      {results.mode === 'commercial'
        ? <CommercialMetrics r={results} />
        : <ResidentialMetrics r={results} />}

      <RedFlags flags={redFlags} />
    </>
  );
};
