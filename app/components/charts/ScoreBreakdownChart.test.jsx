import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="chart-container">{children}</div>,
  BarChart: ({ children }) => <svg data-testid="bar-chart">{children}</svg>,
  Bar: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

import { ScoreBreakdownChart } from './ScoreBreakdownChart';

describe('ScoreBreakdownChart', () => {
  it('renders a chart container from score components', () => {
    const results = { cocScore: 70, capScore: 55, grmScore: 40, onePercScore: 80 };
    render(<ScoreBreakdownChart results={results} />);
    expect(screen.getByTestId('chart-container')).toBeTruthy();
  });
});
