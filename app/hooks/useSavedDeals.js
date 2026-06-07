'use client';
import { useCallback, useEffect, useState } from 'react';
import { loadDeals, saveDeal, deleteDeal } from '../lib/saved-deals';

export function useSavedDeals() {
  const [deals, setDeals] = useState([]);

  useEffect(() => { setDeals(loadDeals()); }, []);

  const save = useCallback((deal) => {
    const saved = saveDeal(deal);
    setDeals(loadDeals());
    return saved;
  }, []);

  const remove = useCallback((id) => {
    setDeals(deleteDeal(id));
  }, []);

  return { deals, save, remove };
}
