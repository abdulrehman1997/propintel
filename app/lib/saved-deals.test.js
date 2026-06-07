import { describe, it, expect, beforeEach } from 'vitest';
import { loadDeals, saveDeal, deleteDeal, STORAGE_KEY } from './saved-deals';

describe('saved-deals repository', () => {
  beforeEach(() => window.localStorage.removeItem(STORAGE_KEY));

  it('returns empty array when nothing stored', () => {
    expect(loadDeals()).toEqual([]);
  });
  it('saves a deal and reads it back', () => {
    const deal = { name: 'Maple St', mode: 'residential', inputs: { purchasePrice: 350000 } };
    const saved = saveDeal(deal);
    expect(saved.id).toBeTruthy();
    expect(saved.savedAt).toBeTypeOf('number');
    const all = loadDeals();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Maple St');
  });
  it('deletes a deal by id immutably', () => {
    const a = saveDeal({ name: 'A', mode: 'residential', inputs: {} });
    saveDeal({ name: 'B', mode: 'commercial', inputs: {} });
    const remaining = deleteDeal(a.id);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].name).toBe('B');
  });
  it('tolerates corrupt JSON and returns empty array', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadDeals()).toEqual([]);
  });
});
