import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSavedDeals } from './useSavedDeals';
import { STORAGE_KEY } from '../lib/saved-deals';

describe('useSavedDeals', () => {
  beforeEach(() => localStorage.clear());

  it('starts empty then reflects a saved deal', () => {
    const { result } = renderHook(() => useSavedDeals());
    expect(result.current.deals).toEqual([]);
    act(() => result.current.save({ name: 'X', mode: 'residential', inputs: {} }));
    expect(result.current.deals).toHaveLength(1);
  });
  it('removes a deal on remove(id)', () => {
    const { result } = renderHook(() => useSavedDeals());
    let id;
    act(() => { id = result.current.save({ name: 'X', mode: 'residential', inputs: {} }).id; });
    act(() => result.current.remove(id));
    expect(result.current.deals).toEqual([]);
  });
});
