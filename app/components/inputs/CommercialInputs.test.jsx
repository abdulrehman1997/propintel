import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommercialInputs } from './CommercialInputs';

const inputs = {
  purchasePrice: 2000000, squareFeet: 12000, units: 8,
  annualGrossIncome: 240000, annualOperatingExpenses: 96000,
  downPaymentPct: 30, interestRate: 7, loanTermYears: 25,
  goingInCapRate: 6, exitCapRate: 6.5,
};

describe('CommercialInputs', () => {
  it('renders square feet and units fields', () => {
    render(<CommercialInputs inputs={inputs} onChange={() => {}} errors={{}} />);
    expect(screen.getByDisplayValue('12000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('8')).toBeInTheDocument();
  });
  it('calls onChange with squareFeet on edit', async () => {
    const onChange = vi.fn();
    render(<CommercialInputs inputs={inputs} onChange={onChange} errors={{}} />);
    await userEvent.type(screen.getByDisplayValue('12000'), '0');
    expect(onChange).toHaveBeenCalledWith('squareFeet', expect.any(String));
  });
  it('shows a commercial validation error', () => {
    render(
      <CommercialInputs
        inputs={inputs}
        onChange={() => {}}
        errors={{ squareFeet: 'Square feet must be greater than 0' }}
      />
    );
    expect(screen.getByText('Square feet must be greater than 0')).toBeInTheDocument();
  });
});
