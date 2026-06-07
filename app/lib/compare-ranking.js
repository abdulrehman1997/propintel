// Metric keys match the engine-adapter result object (real modular engine output).
// higherIsBetter: false means a lower value wins (e.g. GRM).
export const COMPARE_METRICS = [
  { key: 'investmentScore', label: 'Composite Score', higherIsBetter: true },
  { key: 'irr', label: 'IRR', higherIsBetter: true },
  { key: 'equityMultiple', label: 'Equity Multiple', higherIsBetter: true },
  { key: 'cashOnCash', label: 'CoC', higherIsBetter: true },
  { key: 'capRate', label: 'Cap Rate', higherIsBetter: true },
  { key: 'dscr', label: 'DSCR', higherIsBetter: true },
  { key: 'monthlyCashFlow', label: 'Cash Flow', higherIsBetter: true },
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
  // Rank rows by the engine composite score (the real engine output).
  const ordered = [...deals].sort(
    (a, b) => (b.results?.investmentScore ?? 0) - (a.results?.investmentScore ?? 0),
  );
  return { ordered, winners };
}
