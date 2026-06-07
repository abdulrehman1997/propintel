import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// framer-motion uses DOM geometry APIs unavailable in jsdom; stub it out.
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => (({ children, ...rest }) => {
    const { layoutId: _l, ...htmlProps } = rest;
    return <span {...htmlProps}>{children}</span>;
  }) }),
  AnimatePresence: ({ children }) => children,
}));

import { ModeToggle } from './ModeToggle';

describe('ModeToggle', () => {
  it('marks the active mode with aria-pressed', () => {
    render(<ModeToggle mode="residential" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /residential/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /commercial/i })).toHaveAttribute('aria-pressed', 'false');
  });
  it('calls onChange with commercial when clicked', async () => {
    const onChange = vi.fn();
    render(<ModeToggle mode="residential" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /commercial/i }));
    expect(onChange).toHaveBeenCalledWith('commercial');
  });
});
