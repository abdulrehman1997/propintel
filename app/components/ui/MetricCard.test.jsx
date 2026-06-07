import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricCard } from './MetricCard';

describe('MetricCard', () => {
  it('renders label and value', () => {
    render(<MetricCard label="Cap Rate" value="5.20%" benchmark={{ green: 5, red: 3 }} />);
    expect(screen.getByText('Cap Rate')).toBeInTheDocument();
    expect(screen.getByText('5.20%')).toBeInTheDocument();
  });
  it('uses emerald color when numeric value beats green benchmark', () => {
    render(<MetricCard label="CoC" value="8.00%" benchmark={{ green: 6, red: 0 }} />);
    expect(screen.getByText('8.00%')).toHaveClass('text-emerald-500');
  });
  it('uses rose color when value is below red benchmark', () => {
    render(<MetricCard label="CoC" value="-2.00%" benchmark={{ green: 6, red: 0 }} />);
    expect(screen.getByText('-2.00%')).toHaveClass('text-rose-500');
  });
});
