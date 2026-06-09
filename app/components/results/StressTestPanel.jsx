"use client";
import { cn } from "../../lib/cn";
import { formatCurrency } from "../../lib/format";

const LABELS = {
  "rent-5": "Rent −5%",
  "rent-10": "Rent −10%",
  "vacancy+5": "Vacancy +5%",
  "opex+10": "OpEx +10%",
  "opex+20": "OpEx +20%",
  "rate+100bps": "Rate +100bps",
  "rate+200bps": "Rate +200bps",
  "exitCap+50bps": "Exit Cap +50bps",
  "exitCap+100bps": "Exit Cap +100bps",
  "combined-bad-case": "Combined Bad Case",
};

const Pass = ({ ok }) => (
  <span className={cn("font-bold", ok ? "text-emerald-600" : "text-rose-600")}>
    {ok ? "PASS" : "FAIL"}
  </span>
);

export const StressTestPanel = ({ scenarios }) => {
  if (!scenarios || scenarios.length === 0) {
    return (
      <p className="text-xs text-slate-400 italic py-4">
        Stress tests run on residential deals.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-400 uppercase font-bold border-b border-slate-100 text-[10px] tracking-wider">
            <th className="py-2 text-left">Scenario</th>
            <th className="py-2 text-right">NOI</th>
            <th className="py-2 text-right">Cash Flow</th>
            <th className="py-2 text-right">DSCR</th>
            <th className="py-2 text-center">DSCR ≥ 1.0</th>
            <th className="py-2 text-center">CF &gt; 0</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {scenarios.map((s) => (
            <tr key={s.scenario} data-scenario={s.scenario}>
              <td className="py-2 font-medium text-slate-700">
                {LABELS[s.scenario] ?? s.scenario}
              </td>
              <td className="py-2 text-right font-mono text-slate-600">
                {formatCurrency(s.noi)}
              </td>
              <td
                className={cn(
                  "py-2 text-right font-mono",
                  s.annualCashFlow > 0 ? "text-emerald-600" : "text-rose-600",
                )}
              >
                {formatCurrency(s.annualCashFlow)}
              </td>
              <td className="py-2 text-right font-mono text-slate-600">
                {s.dscr.toFixed(2)}
              </td>
              <td className="py-2 text-center">
                <Pass ok={s.dscrPass} />
              </td>
              <td className="py-2 text-center">
                <Pass ok={s.cashFlowPass} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
