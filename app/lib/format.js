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
  if (value === null || value === undefined || Number.isNaN(value)) return '0.00%';
  return `${Number(value).toFixed(2)}%`;
}
