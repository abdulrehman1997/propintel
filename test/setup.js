import '@testing-library/jest-dom/vitest';

// Minimal localStorage mock for jsdom environments that lack one.
// A single object per vitest worker is fine — each test file runs in isolation.
const _store = {};
const localStorageMock = {
  getItem: (k) => (k in _store ? _store[k] : null),
  setItem: (k, v) => { _store[k] = String(v); },
  removeItem: (k) => { delete _store[k]; },
  clear: () => { Object.keys(_store).forEach((k) => delete _store[k]); },
};
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});
Object.defineProperty(globalThis, 'window', {
  value: { ...globalThis.window, localStorage: localStorageMock },
  writable: true,
});
