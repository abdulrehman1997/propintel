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
  if (score >= 70) return '#1F3D32'; // forest
  if (score >= 40) return '#A9842F'; // muted amber
  return '#A85C45'; // muted clay
};

export const ScoreBreakdownChart = ({ results }) => {
  const data = COMPONENTS.map(({ key, label }) => ({
    label,
    score: results?.[key] ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="#E7E1D5" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9A9385' }} stroke="#D6CFC0" />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9A9385' }} stroke="#D6CFC0" width={32} />
        <RTooltip
          formatter={(v) => `${v} / 100`}
          cursor={{ fill: 'rgba(31,61,50,0.06)' }}
          contentStyle={{ background: '#fffdf8', border: '1px solid #E7E1D5', borderRadius: 12, fontSize: 12 }}
        />
        <Bar dataKey="score" radius={[4, 4, 0, 0]}>
          {data.map((entry, idx) => (
            <Cell key={idx} fill={barColor(entry.score)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
