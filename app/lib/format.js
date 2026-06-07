export function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value) {
  // null / undefined / NaN means the metric is undefined (e.g. IRR with no sign
  // change in the cash-flow stream). Render 'N/A' rather than a misleading 0.00%,
  // which would imply a real break-even result. A genuine numeric 0 still shows
  // '0.00%'.
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';
  return `${Number(value).toFixed(2)}%`;
}
