export const STORAGE_KEY = 'propintel.savedDeals.v1';

export function loadDeals() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(deals) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
  return deals;
}

export function saveDeal(deal) {
  const saved = {
    id: deal.id ?? `deal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: deal.name,
    mode: deal.mode,
    inputs: deal.inputs,
    savedAt: Date.now(),
  };
  const existing = loadDeals().filter((d) => d.id !== saved.id);
  persist([...existing, saved]);
  return saved;
}

export function deleteDeal(id) {
  const remaining = loadDeals().filter((d) => d.id !== id);
  return persist(remaining);
}
