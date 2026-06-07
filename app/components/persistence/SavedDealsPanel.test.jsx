import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SavedDealsPanel } from './SavedDealsPanel';

const deals = [{ id: 'a', name: 'Maple St', mode: 'residential', inputs: {}, savedAt: 1 }];

describe('SavedDealsPanel', () => {
  it('saves the current deal with a typed name', async () => {
    const onSave = vi.fn();
    render(<SavedDealsPanel deals={[]} onSave={onSave} onLoad={() => {}} onDelete={() => {}} />);
    await userEvent.type(screen.getByPlaceholderText(/name this deal/i), 'Maple St');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(onSave).toHaveBeenCalledWith('Maple St');
  });
  it('loads a saved deal', async () => {
    const onLoad = vi.fn();
    render(<SavedDealsPanel deals={deals} onSave={() => {}} onLoad={onLoad} onDelete={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /load maple st/i }));
    expect(onLoad).toHaveBeenCalledWith('a');
  });
  it('deletes a saved deal', async () => {
    const onDelete = vi.fn();
    render(<SavedDealsPanel deals={deals} onSave={() => {}} onLoad={() => {}} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole('button', { name: /delete maple st/i }));
    expect(onDelete).toHaveBeenCalledWith('a');
  });
});
