"use client";
import { formatCurrency } from "../../lib/format";
import { ProjectionChart } from "../charts/ProjectionChart";

export const ProjectionsPanel = ({ projections }) => (
  <div className="p-8 rise-in">
    <h4 className="font-display text-lg font-medium text-ink-900 border-b border-paper-200 pb-3 mb-5">
      5-Year Growth Forecast
    </h4>
    <ProjectionChart projections={projections} />
    <div className="mt-8 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-ink-400 uppercase text-[10px] tracking-[0.14em] font-semibold border-b border-paper-200">
            <th className="py-2.5">Year</th>
            <th className="py-2.5">Value</th>
            <th className="py-2.5">Equity</th>
            <th className="py-2.5 text-right">Cash Flow</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-paper-200 tabular-nums">
          {projections.map((p) => (
            <tr key={p.year} className="transition-colors hover:bg-paper-50">
              <td className="py-3 font-display font-medium text-ink-900">
                {p.year}
              </td>
              <td className="py-3 text-ink-700">
                {formatCurrency(p.propertyValue)}
              </td>
              <td className="py-3 text-ink-700">{formatCurrency(p.equity)}</td>
              <td className="py-3 text-right font-medium text-emerald-600">
                {formatCurrency(p.annualCashFlow)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
