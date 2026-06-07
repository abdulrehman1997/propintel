'use client';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend,
} from 'recharts';
import { formatCurrency } from '../../lib/format';

export const ProjectionChart = ({ projections }) => {
  if (!projections || projections.length === 0) {
    return <p className="text-xs text-slate-400 italic py-8 text-center">No projection data yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={projections} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="year" tick={{ fontSize: 11 }} label={{ value: 'Year', position: 'insideBottomRight', offset: -8, fontSize: 11 }} />
        <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} width={56} />
        <RTooltip formatter={(value) => formatCurrency(value)} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="propertyValue" name="Value" stroke="#6366f1" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="equity" name="Equity" stroke="#10b981" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="annualCashFlow" name="Cash Flow" stroke="#f59e0b" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
};
