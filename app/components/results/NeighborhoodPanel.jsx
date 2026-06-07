"use client";
import { MapPin, AlertCircle } from "lucide-react";
import { cn } from "../../lib/cn";
import { formatCurrency } from "../../lib/format";

// The neighborhood score defaults every sub-score to 50 when its input is null,
// so a "50" can appear with zero real data behind it. Only present a numeric
// score when at least one metric (incl. an FMR rent fallback) actually has data.
const hasRealData = (data) => {
  const c = data.census || {};
  const fmr = data.fmr || {};
  return (
    c.medianIncome != null ||
    c.vacancyRate != null ||
    c.unemploymentRate != null ||
    c.medianRent != null ||
    fmr.twoBed != null ||
    fmr.oneBed != null ||
    fmr.studio != null
  );
};

// Median Rent: prefer Census median rent; fall back to HUD FMR (2BR → 1BR →
// studio) so seeded rent data is surfaced.
const medianRentValue = (data) => {
  const c = data.census || {};
  const fmr = data.fmr || {};
  const rent = c.medianRent ?? fmr.twoBed ?? fmr.oneBed ?? fmr.studio;
  return rent != null ? formatCurrency(rent) : "N/A";
};

const ScoreBadge = ({ data }) => {
  if (!hasRealData(data)) {
    return (
      <div
        className="px-5 py-2.5 rounded-2xl font-display text-3xl font-light bg-paper-100 text-ink-400"
        title="No neighborhood data available for this ZIP"
      >
        —
      </div>
    );
  }
  const score = Math.round(data.neighborhoodScore);
  return (
    <div
      className={cn(
        "px-5 py-2.5 rounded-2xl font-display text-3xl font-light",
        score >= 65
          ? "bg-emerald-100 text-emerald-800"
          : "bg-amber-100 text-amber-800",
      )}
    >
      {score}
    </div>
  );
};

export const NeighborhoodPanel = ({ data }) => {
  if (!data) {
    return (
      <div className="p-8 rise-in">
        <div className="text-center py-14">
          <MapPin
            size={44}
            className="mx-auto text-paper-300 mb-4"
            strokeWidth={1.5}
          />
          <h3 className="font-display text-xl font-medium text-ink-800">
            No Location Selected
          </h3>
          <p className="text-ink-500 text-sm max-w-xs mx-auto mt-1">
            Enter a 5-digit zip code in the Location card to see neighborhood
            intelligence.
          </p>
        </div>
      </div>
    );
  }

  const c = data.census || {};
  const metrics = [
    [
      "Median Income",
      c.medianIncome != null ? formatCurrency(c.medianIncome) : "N/A",
    ],
    [
      "Vacancy Rate",
      c.vacancyRate != null ? `${c.vacancyRate.toFixed(1)}%` : "N/A",
    ],
    [
      "Unemployment",
      c.unemploymentRate != null ? `${c.unemploymentRate.toFixed(1)}%` : "N/A",
    ],
    ["Median Rent", medianRentValue(data)],
  ];

  return (
    <div className="p-8 rise-in">
      <div className="space-y-6">
        {data.source === "unavailable" && (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>
              {data.message ||
                "Neighborhood data is unavailable. Seed the local database or add Census/HUD API keys to enable it."}
            </span>
          </div>
        )}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-xl font-medium text-ink-900">
              {[data.location?.city, data.location?.state]
                .filter(Boolean)
                .join(", ") || "Neighborhood"}
            </h3>
            <p className="text-ink-400 text-sm">{data.location?.zip}</p>
          </div>
          <ScoreBadge data={data} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {metrics.map(([label, val]) => (
            <div
              key={label}
              className="bg-paper-50 border border-paper-200 rounded-2xl p-4"
            >
              <p className="text-ink-400 uppercase tracking-[0.14em] text-[10px] font-semibold mb-1.5">
                {label}
              </p>
              <p className="font-display text-xl font-medium text-ink-900 tabular-nums">
                {val}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
