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

export const DealResults = ({ results }) => {
  if (!results) return null;
  const {
    investmentGrade, investmentScore, monthlyCashFlow,
    cashOnCash, capRate, GRM, onePercentRule, annualROI, blended,
  } = results;

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

      <div className="p-8 grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard label="Monthly Cash Flow" value={formatCurrency(monthlyCashFlow)} benchmark={{ green: 200, red: 0 }} />
        <MetricCard label="CoC Return" value={formatPercent(cashOnCash)} benchmark={{ green: 6, red: 0 }} />
        <MetricCard label="Cap Rate" value={formatPercent(capRate)} benchmark={{ green: 5, red: 3 }} />
        <MetricCard label="GRM" value={GRM != null ? GRM.toFixed(1) : 'N/A'} benchmark={{ green: -12, red: -20 }} />
        <MetricCard label="1% Rule" value={onePercentRule >= 1 ? '✅ PASS' : '❌ FAIL'} benchmark={{ green: 1.0, red: 0.7 }} />
        <MetricCard label="Annual ROI" value={formatPercent(annualROI)} benchmark={{ green: 8, red: 2 }} />
      </div>
    </>
  );
};
