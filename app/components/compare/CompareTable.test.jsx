import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompareTable } from './CompareTable';

const deals = [
  { id: 'a', name: 'Maple', mode: 'residential', inputs: {}, results: { investmentScore: 80, monthlyCashFlow: 400, cashOnCash: 9, capRate: 6, annualROI: 10, GRM: 11 } },
  { id: 'b', name: 'Oak', mode: 'residential', inputs: {}, results: { investmentScore: 50, monthlyCashFlow: 100, cashOnCash: 4, capRate: 5, annualROI: 6, GRM: 16 } },
];

describe('CompareTable', () => {
  it('renders one column per deal', () => {
    render(<CompareTable deals={deals} onRemove={() => {}} />);
    expect(screen.getByText('Maple')).toBeInTheDocument();
    expect(screen.getByText('Oak')).toBeInTheDocument();
  });
  it('highlights the per-metric winner cell', () => {
    render(<CompareTable deals={deals} onRemove={() => {}} />);
    const cashRow = screen.getByText('Cash Flow').closest('tr');
    const winnerCell = within(cashRow).getByText('$400');
    expect(winnerCell.closest('td')).toHaveAttribute('data-winner', 'true');
  });
  it('calls onRemove with the deal id', async () => {
    const onRemove = vi.fn();
    render(<CompareTable deals={deals} onRemove={onRemove} />);
    await userEvent.click(screen.getByRole('button', { name: /remove maple/i }));
    expect(onRemove).toHaveBeenCalledWith('a');
  });
});
