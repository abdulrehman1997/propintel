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
  const axis = { fontSize: 11, fill: '#9A9385' };
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={projections} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="#E7E1D5" vertical={false} />
        <XAxis dataKey="year" tick={axis} stroke="#D6CFC0" label={{ value: 'Year', position: 'insideBottomRight', offset: -8, fontSize: 11, fill: '#9A9385' }} />
        <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={axis} stroke="#D6CFC0" width={56} />
        <RTooltip
          formatter={(value) => formatCurrency(value)}
          contentStyle={{ background: '#fffdf8', border: '1px solid #E7E1D5', borderRadius: 12, fontSize: 12, boxShadow: '0 8px 24px -12px rgba(26,26,26,0.18)' }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#736D60' }} />
        <Line type="monotone" dataKey="propertyValue" name="Value" stroke="#1F3D32" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="equity" name="Equity" stroke="#B08D57" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="annualCashFlow" name="Cash Flow" stroke="#4F7A5C" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
};
