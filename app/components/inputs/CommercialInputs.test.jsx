import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommercialInputs } from './CommercialInputs';

// Real engine-shape commercial inputs (units array, lease type, debt constraints).
const inputs = {
  assetType: 'multifamily',
  purchasePrice: 2000000,
  squareFeet: 12000,
  rentableSqft: 12000,
  units: [{ count: 8, marketRent: 2500, inPlaceRent: 2400 }],
  leaseType: 'gross',
  recoveryRatio: 0,
  vacancyPct: 5,
  creditLossPct: 1,
  opexAnnual: 96000,
  goingInCapRate: 6,
  exitCapRate: 6.5,
  maxLTV: 75,
  minDSCR: 1.25,
  minDebtYield: 8,
  interestRate: 7,
  amortYears: 25,
  holdYears: 5,
  rentGrowthPct: 3,
  expenseGrowthPct: 3,
  saleCostPct: 2,
};

describe('CommercialInputs', () => {
  it('renders rentable square feet and the rent roll', () => {
    render(<CommercialInputs inputs={inputs} onChange={() => {}} errors={{}} />);
    expect(screen.getByDisplayValue('12000')).toBeInTheDocument();
    expect(screen.getByText(/rent roll/i)).toBeInTheDocument();
  });

  it('renders debt-sizing controls (LTV / DSCR / debt yield)', () => {
    render(<CommercialInputs inputs={inputs} onChange={() => {}} errors={{}} />);
    expect(screen.getByText(/debt sizing/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('1.25')).toBeInTheDocument(); // minDSCR
  });

  it('lets the user pick a lease type', () => {
    render(<CommercialInputs inputs={inputs} onChange={() => {}} errors={{}} />);
    expect(screen.getByText('NNN')).toBeInTheDocument();
    expect(screen.getByText('Modified Gross')).toBeInTheDocument();
  });

  it('calls onChange with rentableSqft on edit', async () => {
    const onChange = vi.fn();
    render(<CommercialInputs inputs={inputs} onChange={onChange} errors={{}} />);
    await userEvent.type(screen.getByDisplayValue('12000'), '0');
    expect(onChange).toHaveBeenCalledWith('rentableSqft', expect.any(String));
  });

  it('shows a commercial validation error', () => {
    render(
      <CommercialInputs
        inputs={inputs}
        onChange={() => {}}
        errors={{ rentableSqft: 'Square feet must be greater than 0' }}
      />
    );
    expect(screen.getByText('Square feet must be greater than 0')).toBeInTheDocument();
  });
});
