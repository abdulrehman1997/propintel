import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => ({ children, ...rest }) => {
      const { layoutId: _l, initial: _i, animate: _a, ...htmlProps } = rest;
      return <div {...htmlProps}>{children}</div>;
    },
  }),
  AnimatePresence: ({ children }) => children,
}));

import { DealResults } from './DealResults';

const results = {
  investmentGrade: 'B', investmentScore: 67, monthlyCashFlow: 350,
  cashOnCash: 7.2, capRate: 5.4, GRM: 12.5, onePercentRule: 0.9, annualROI: 9.1,
};

describe('DealResults', () => {
  it('shows the investment grade and rounded score', () => {
    render(<DealResults results={results} />);
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText(/Score: 67 \/ 100/)).toBeInTheDocument();
  });
  it('renders the metric grid values', () => {
    render(<DealResults results={results} />);
    expect(screen.getByText('$350')).toBeInTheDocument();
    expect(screen.getByText('5.40%')).toBeInTheDocument();
  });
});
