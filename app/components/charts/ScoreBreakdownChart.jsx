'use client';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Cell,
} from 'recharts';

const COMPONENTS = [
  { key: 'cocScore', label: 'CoC' },
  { key: 'capScore', label: 'Cap Rate' },
  { key: 'grmScore', label: 'GRM' },
  { key: 'onePercScore', label: '1% Rule' },
];

const barColor = (score) => {
  if (score >= 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#f43f5e';
};

export const ScoreBreakdownChart = ({ results }) => {
  const data = COMPONENTS.map(({ key, label }) => ({
    label,
    score: results?.[key] ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={32} />
        <RTooltip formatter={(v) => `${v} / 100`} />
        <Bar dataKey="score" radius={[4, 4, 0, 0]}>
          {data.map((entry, idx) => (
            <Cell key={idx} fill={barColor(entry.score)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
