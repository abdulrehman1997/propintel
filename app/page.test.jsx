import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Stub framer-motion
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => ({ children, ...rest }) => {
      const { layoutId: _l, initial: _i, animate: _a, exit: _e, ...htmlProps } = rest;
      return <div {...htmlProps}>{children}</div>;
    },
  }),
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Stub recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="chart-container">{children}</div>,
  LineChart: ({ children }) => <svg>{children}</svg>,
  BarChart: ({ children }) => <svg>{children}</svg>,
  Line: () => null, Bar: () => null, Cell: () => null,
  XAxis: () => null, YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null, Legend: () => null,
}));

import App from './page';

beforeEach(() => localStorage.clear());

describe('App shell', () => {
  it('renders residential inputs by default', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /residential/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByDisplayValue('350000')).toBeInTheDocument();
  });
  it('swaps to commercial inputs when toggled', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /commercial/i }));
    expect(screen.getByRole('button', { name: /commercial/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/square feet/i)).toBeInTheDocument();
  });
});
