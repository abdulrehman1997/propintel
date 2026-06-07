'use client';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { formatCurrency, formatPercent } from '../../lib/format';
import { COMPARE_METRICS, rankDeals } from '../../lib/compare-ranking';

const formatMetric = (key, value) => {
  if (value === null || value === undefined) return '—';
  if (key === 'monthlyCashFlow') return formatCurrency(value);
  if (key === 'GRM') return Number(value).toFixed(1);
  if (key === 'investmentScore') return Math.round(value);
  return formatPercent(value);
};

export const CompareTable = ({ deals, onRemove }) => {
  if (!deals || deals.length === 0) {
    return <p className="text-xs text-slate-400 italic py-4">No deals to compare yet. Save 2–4 deals to compare them.</p>;
  }

  const { ordered, winners } = rankDeals(deals);

  // Map ordered deal back to original index for winner lookup
  const origIndices = ordered.map((od) => deals.findIndex((d) => d.id === od.id));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="py-2 pr-4 text-left text-slate-400 font-normal uppercase tracking-wider">Metric</th>
            {ordered.map((deal) => (
              <th key={deal.id} className="py-2 px-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className="font-bold text-slate-800">{deal.name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${deal.name}`}
                    onClick={() => onRemove(deal.id)}
                    className="text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
                <div className="text-[10px] text-slate-400 font-normal capitalize">{deal.mode}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {COMPARE_METRICS.map((metric) => (
            <tr key={metric.key}>
              <td className="py-2 pr-4 text-slate-500">{metric.label}</td>
              {ordered.map((deal, colIdx) => {
                const origIdx = origIndices[colIdx];
                const isWinner = winners[metric.key] === origIdx;
                const value = deal.results?.[metric.key];
                return (
                  <td
                    key={deal.id}
                    data-winner={isWinner ? 'true' : undefined}
                    className={cn(
                      'py-2 px-3 text-center font-mono',
                      isWinner
                        ? 'text-emerald-600 font-bold bg-emerald-50 rounded'
                        : 'text-slate-700',
                    )}
                  >
                    {formatMetric(metric.key, value)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
