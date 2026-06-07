'use client';
import { cn } from '../../lib/cn';

// Rate deltas (rows): −100bps to +100bps in 50bps steps
const RATE_DELTAS = [-1, -0.5, 0, 0.5, 1];
// Cap deltas (cols): −100bps to +100bps in 50bps steps
const CAP_DELTAS = [-1, -0.5, 0, 0.5, 1];

// Default exit cap used when the deal has no explicit one. The engine treats a
// 0/unset exit cap as "fall back to appreciated value", which would make every
// exit-cap column collapse to the same number. Centring the sweep on a real,
// positive cap keeps the horizontal axis meaningful.
const DEFAULT_EXIT_CAP = 6;

const baseExitCap = (baseInputs) => {
  const candidates = [baseInputs.exitCapRate, baseInputs.goingInCapRate, baseInputs.capRate];
  const positive = candidates.find((c) => Number(c) > 0);
  return positive != null ? Number(positive) : DEFAULT_EXIT_CAP;
};

export function buildSensitivityGrid({ baseInputs, compute }) {
  const exitCapBase = baseExitCap(baseInputs);
  return RATE_DELTAS.map((rd) => ({
    rateDelta: rd,
    cells: CAP_DELTAS.map((cd) => {
      const inputs = {
        ...baseInputs,
        interestRate: (baseInputs.interestRate ?? 0) + rd,
        exitCapRate: exitCapBase + cd,
      };
      return { capDelta: cd, value: compute(inputs) };
    }),
  }));
}

const cellColor = (value, min, max) => {
  if (max === min) return 'bg-slate-100';
  const t = (value - min) / (max - min); // 0=bad(red) 1=good(green)
  if (t >= 0.67) return 'bg-emerald-100 text-emerald-800';
  if (t >= 0.34) return 'bg-amber-100 text-amber-800';
  return 'bg-rose-100 text-rose-800';
};

export const SensitivityHeatmap = ({ baseInputs, compute, label = 'Levered IRR' }) => {
  const grid = buildSensitivityGrid({ baseInputs, compute });
  const allValues = grid.flatMap((r) => r.cells.map((c) => c.value));
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);

  return (
    <div className="overflow-x-auto">
      <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">{label} — Rate ↕ vs Exit Cap →</p>
      <table role="table" className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="p-1 text-slate-400 font-normal text-right">Rate Δ \ Cap Δ</th>
            {CAP_DELTAS.map((cd) => (
              <th key={cd} className="p-1 text-center text-slate-500 font-semibold">
                {cd > 0 ? '+' : ''}{cd}%
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((row) => (
            <tr key={row.rateDelta}>
              <td className="p-1 text-right text-slate-500 font-semibold">
                {row.rateDelta > 0 ? '+' : ''}{row.rateDelta}%
              </td>
              {row.cells.map((cell) => (
                <td
                  key={cell.capDelta}
                  role="cell"
                  className={cn('p-1 text-center rounded font-mono', cellColor(cell.value, min, max))}
                >
                  {typeof cell.value === 'number' ? cell.value.toFixed(2) : cell.value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
