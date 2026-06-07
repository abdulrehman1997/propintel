// Metric keys match lib/calculations.js result object.
// higherIsBetter: false means a lower value wins (e.g. GRM).
export const COMPARE_METRICS = [
  { key: 'investmentScore', label: 'Score', higherIsBetter: true },
  { key: 'monthlyCashFlow', label: 'Cash Flow', higherIsBetter: true },
  { key: 'cashOnCash', label: 'CoC', higherIsBetter: true },
  { key: 'capRate', label: 'Cap Rate', higherIsBetter: true },
  { key: 'annualROI', label: 'ROI', higherIsBetter: true },
  { key: 'GRM', label: 'GRM', higherIsBetter: false },
];

export function rankDeals(deals) {
  const winners = {};
  for (const metric of COMPARE_METRICS) {
    let bestIdx = -1;
    let bestVal = null;
    deals.forEach((deal, idx) => {
      const v = deal.results?.[metric.key];
      if (v === null || v === undefined || Number.isNaN(v)) return;
      if (bestVal === null || (metric.higherIsBetter ? v > bestVal : v < bestVal)) {
        bestVal = v;
        bestIdx = idx;
      }
    });
    winners[metric.key] = bestIdx;
  }
  const ordered = [...deals].sort(
    (a, b) => (b.results?.investmentScore ?? 0) - (a.results?.investmentScore ?? 0),
  );
  return { ordered, winners };
}
