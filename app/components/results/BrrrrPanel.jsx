'use client';
import { cn } from '../../lib/cn';
import { formatCurrency, formatPercent } from '../../lib/format';
import { InputGroup } from '../ui/InputGroup';
import { MetricCard } from '../ui/MetricCard';
import { Infinity as InfinityIcon, AlertCircle } from 'lucide-react';

const inputCls = 'w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all tabular-nums text-sm';

const Money = ({ value, onChange }) => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
    <input type="number" value={value} onChange={onChange} className={cn(inputCls, 'pl-7')} />
  </div>
);

const Pct = ({ value, onChange, step = '0.1' }) => (
  <div className="relative">
    <input type="number" step={step} value={value} onChange={onChange} className={cn(inputCls, 'pr-7')} />
    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
  </div>
);

/**
 * BRRRR / refi panel (residential). Collects rehab + refi inputs and renders the
 * lib/brrrr.js result: cash-left-in-deal, cash-out, post-refi cash flow, and the
 * infinite-return flag.
 */
export const BrrrrPanel = ({ inputs, results, onChange }) => {
  const handle = (key, value) => onChange(key, value);
  if (!results) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <InputGroup label="Rehab Budget">
          <Money value={inputs.rehabBudget ?? inputs.repairCosts ?? 0} onChange={(e) => handle('rehabBudget', e.target.value)} />
        </InputGroup>
        <InputGroup label="ARV (After-Repair Value)">
          <Money value={inputs.arv ?? 0} onChange={(e) => handle('arv', e.target.value)} />
        </InputGroup>
        <InputGroup label="Rehab Months">
          <input type="number" value={inputs.rehabMonths ?? 0} onChange={(e) => handle('rehabMonths', e.target.value)} className={inputCls} />
        </InputGroup>
        <InputGroup label="Hard-Money Rate %"><Pct value={inputs.hardMoneyRate ?? 0} onChange={(e) => handle('hardMoneyRate', e.target.value)} /></InputGroup>
        <InputGroup label="Refi LTV %"><Pct value={inputs.refiLtv ?? 75} onChange={(e) => handle('refiLtv', e.target.value)} step="1" /></InputGroup>
        <InputGroup label="Refi Rate %"><Pct value={inputs.refiRate ?? 7} onChange={(e) => handle('refiRate', e.target.value)} step="0.01" /></InputGroup>
      </div>

      {results.infiniteReturn && (
        <div data-testid="infinite-return" className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm font-bold">
          <InfinityIcon size={18} /> Infinite return — all capital recovered with positive post-refi cash flow.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard label="All-In Cost" value={formatCurrency(results.allInCost)} />
        <MetricCard label="Refi Loan" value={formatCurrency(results.refiLoan)} />
        <MetricCard label="Cash Left In Deal" value={formatCurrency(results.cashLeftInDeal)} benchmark={{ green: -1, red: 1 }} tooltip="≤ 0 means all capital recovered." />
        <MetricCard label="Cash Out" value={formatCurrency(results.cashOut)} benchmark={{ green: 0, red: -1 }} />
        <MetricCard label="Post-Refi Cash Flow" value={formatCurrency(results.postRefiCashFlow)} benchmark={{ green: 1, red: 0 }} />
        <MetricCard
          label="Post-Refi CoC"
          value={results.postRefiCoCPct != null ? formatPercent(results.postRefiCoCPct) : '∞ / N/A'}
          benchmark={{ green: 8, red: 0 }}
        />
        <MetricCard label="Max 70%-Rule Offer" value={formatCurrency(results.maxOffer70)} tooltip="0.70 × ARV − rehab." />
      </div>

      {results.warnings?.length > 0 && (
        <div className="space-y-1">
          {results.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-600 flex items-center gap-1">
              <AlertCircle size={12} /> {w}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
