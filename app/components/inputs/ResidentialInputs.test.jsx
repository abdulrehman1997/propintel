import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => ({ children, ...rest }) => {
      const { layoutId: _l, initial: _i, animate: _a, ...htmlProps } = rest;
      return <div {...htmlProps}>{children}</div>;
    },
  }),
  AnimatePresence: ({ children }) => children,
}));

import { ResidentialInputs } from './ResidentialInputs';

const inputs = {
  purchasePrice: 350000, repairCosts: 0, downPaymentPct: 20, interestRate: 7,
  loanTermYears: 30, monthlyRent: 2200, vacancyPct: 5, managementPct: 10,
  maintenancePct: 1, capExPct: 5, annualPropertyTax: 4200, annualInsurance: 1800,
  monthlyHOA: 0, bedrooms: 3,
};

describe('ResidentialInputs', () => {
  it('renders the purchase price field with current value', () => {
    render(<ResidentialInputs inputs={inputs} results={{ downPaymentDollar: 70000 }} onChange={() => {}} errors={{}} />);
    expect(screen.getByDisplayValue('350000')).toBeInTheDocument();
  });
  it('calls onChange with key and value on edit', async () => {
    const onChange = vi.fn();
    render(<ResidentialInputs inputs={inputs} results={{ downPaymentDollar: 70000 }} onChange={onChange} errors={{}} />);
    const price = screen.getByDisplayValue('350000');
    await userEvent.type(price, '5');
    expect(onChange).toHaveBeenCalledWith('purchasePrice', expect.any(String));
  });
  it('shows a validation error message when provided', () => {
    render(
      <ResidentialInputs
        inputs={inputs}
        results={{ downPaymentDollar: 70000 }}
        onChange={() => {}}
        errors={{ purchasePrice: 'Purchase price must be greater than 0' }}
      />
    );
    expect(screen.getByText('Purchase price must be greater than 0')).toBeInTheDocument();
  });
});
