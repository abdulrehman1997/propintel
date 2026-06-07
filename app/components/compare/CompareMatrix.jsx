"use client";
import { cn } from "../../lib/cn";
import { formatCurrency, formatPercent } from "../../lib/format";

// rows: [label, accessor, formatter, higherIsBetter]
const ROWS = [
  ["Price", (c) => c.listing.price, formatCurrency, false],
  ["Beds", (c) => c.listing.beds, (v) => v, true],
  [
    "Grade",
    (c) => c.results.investmentScore,
    (v, c) => `${c.results.investmentGrade} (${Math.round(v)})`,
    true,
  ],
  ["Cash flow/mo", (c) => c.results.monthlyCashFlow, formatCurrency, true],
  ["CoC", (c) => c.results.cashOnCash, formatPercent, true],
  ["Cap rate", (c) => c.results.capRate, formatPercent, true],
  ["IRR", (c) => c.results.irr, formatPercent, true],
  [
    "DSCR",
    (c) => c.results.dscr,
    (v) => (v == null ? "N/A" : v.toFixed(2)),
    true,
  ],
];

export function CompareMatrix({ columns, onRemove }) {
  const bestIndex = (accessor, higher) => {
    const vals = columns.map((c) => Number(accessor(c)));
    const target = higher ? Math.max(...vals) : Math.min(...vals);
    return vals.indexOf(target);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-paper-200 text-left">
            <th className="p-2 w-32" />
            {columns.map((c) => (
              <th key={c.listing.id} className="p-2 align-top">
                <div className="font-display text-ink-900">
                  {c.listing.street}
                </div>
                <div className="text-ink-400 text-xs">
                  {c.listing.city}, {c.listing.state}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(c.listing.id)}
                  aria-label={`Remove ${c.listing.street} from comparison`}
                  className="text-[10px] uppercase tracking-widest text-rose-500 mt-1"
                >
                  remove
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {ROWS.map(([label, accessor, fmt, higher]) => {
            const best = bestIndex(accessor, higher);
            return (
              <tr key={label} className="border-b border-paper-200">
                <td className="p-2 text-[10px] uppercase tracking-[0.14em] text-ink-400 font-semibold">
                  {label}
                </td>
                {columns.map((c, i) => (
                  <td
                    key={c.listing.id}
                    className={cn(
                      "p-2",
                      i === best &&
                        "bg-emerald-50 font-semibold text-emerald-800 best",
                    )}
                  >
                    {fmt(accessor(c), c)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
