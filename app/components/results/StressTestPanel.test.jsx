import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { residentialStressTests } from '../../lib/engine-adapter';
import { StressTestPanel } from './StressTestPanel';

const inputs = {
  purchasePrice: 350000, downPaymentPct: 20, interestRate: 7, loanTermYears: 30,
  annualPropertyTax: 4200, annualInsurance: 1800, monthlyRent: 2200, vacancyPct: 5,
  managementPct: 10, maintenancePct: 1, capExPct: 5, holdYears: 5,
};

describe('StressTestPanel', () => {
  it('renders the full 10-scenario battery from the engine', () => {
    const scenarios = residentialStressTests(inputs);
    expect(scenarios).toHaveLength(10);
    render(<StressTestPanel scenarios={scenarios} />);
    expect(screen.getByText(/Combined Bad Case/i)).toBeInTheDocument();
    expect(screen.getByText(/Rate \+200bps/i)).toBeInTheDocument();
  });

  it('shows a fallback when no scenarios are provided', () => {
    render(<StressTestPanel scenarios={[]} />);
    expect(screen.getByText(/stress tests run on residential/i)).toBeInTheDocument();
  });
});
