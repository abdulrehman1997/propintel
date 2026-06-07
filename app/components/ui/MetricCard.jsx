'use client';
import { cn } from '../../lib/cn';
import { Tooltip } from './Tooltip';

const parseNumeric = (value) => {
  if (typeof value === 'number') return value;
  const n = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isNaN(n) ? null : n;
};

const valueColor = (value, benchmark) => {
  if (!benchmark) return 'text-slate-700';
  const n = parseNumeric(value);
  if (n === null) return 'text-slate-700';
  if (n >= benchmark.green) return 'text-emerald-500';
  if (n < benchmark.red) return 'text-rose-500';
  return 'text-amber-500';
};

export const MetricCard = ({ label, value, benchmark, tooltip }) => {
  const colorClass = valueColor(value, benchmark);
  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
      <div className="flex items-center text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </div>
      <div className={cn('text-xl md:text-2xl font-bold tabular-nums', colorClass)}>
        {value}
      </div>
    </div>
  );
};
