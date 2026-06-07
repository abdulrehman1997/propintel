import "@testing-library/jest-dom/vitest";

// Minimal localStorage mock for jsdom environments that lack one.
// A single object per vitest worker is fine — each test file runs in isolation.
const _store = {};
const localStorageMock = {
  getItem: (k) => (k in _store ? _store[k] : null),
  setItem: (k, v) => {
    _store[k] = String(v);
  },
  removeItem: (k) => {
    delete _store[k];
  },
  clear: () => {
    Object.keys(_store).forEach((k) => delete _store[k]);
  },
};

// Attach the mock to the EXISTING jsdom window/global — do NOT replace window.
// Spreading `{ ...window }` into a new object strips jsdom's prototype chain and
// live event bindings, which makes React DOM's feature detection fall back to
// the legacy IE `attachEvent` polyfill path and throw
// "activeElement.attachEvent is not a function" during input events.
Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
  configurable: true,
});
if (globalThis.window) {
  Object.defineProperty(globalThis.window, "localStorage", {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
}

// Defensive no-op for the IE-era event polyfill jsdom does not implement.
// React 19's dev build probes `attachEvent`/`detachEvent` on the active element
// in some jsdom versions; stubbing them keeps input-event tests from crashing.
if (globalThis.HTMLElement) {
  if (typeof globalThis.HTMLElement.prototype.attachEvent !== "function") {
    globalThis.HTMLElement.prototype.attachEvent = () => {};
  }
  if (typeof globalThis.HTMLElement.prototype.detachEvent !== "function") {
    globalThis.HTMLElement.prototype.detachEvent = () => {};
  }
}
