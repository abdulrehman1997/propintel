"use client";
import { cn } from "../../lib/cn";
import { Tooltip } from "./Tooltip";

const parseNumeric = (value) => {
  if (typeof value === "number") return value;
  const n = parseFloat(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isNaN(n) ? null : n;
};

// Desaturated semantic tones. Classes preserved for tests; theme remaps them.
const valueColor = (value, benchmark) => {
  if (!benchmark) return "text-ink-800";
  const n = parseNumeric(value);
  if (n === null) return "text-ink-800";
  if (n >= benchmark.green) return "text-emerald-500";
  if (n < benchmark.red) return "text-rose-500";
  return "text-amber-500";
};

export const MetricCard = ({ label, value, benchmark, tooltip }) => {
  const colorClass = valueColor(value, benchmark);
  return (
    <div className="rounded-2xl bg-paper-50 border border-paper-200 px-4 py-3.5 transition-colors duration-200 hover:border-paper-300">
      <div className="flex items-center text-[10px] uppercase tracking-[0.14em] font-semibold text-ink-400 mb-1.5">
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </div>
      <div
        className={cn(
          "font-display text-2xl md:text-[1.7rem] font-medium tabular-nums leading-none",
          colorClass,
        )}
      >
        {value}
      </div>
    </div>
  );
};
