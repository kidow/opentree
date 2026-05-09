import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { clearMocks } from "@tauri-apps/api/mocks";

// Stub crypto.randomUUID for deterministic test runs.
let counter = 0;
Object.defineProperty(globalThis.crypto, "randomUUID", {
  value: () => {
    counter += 1;
    return `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}` as `${string}-${string}-${string}-${string}-${string}`;
  },
  configurable: true,
  writable: true,
});

// jsdom doesn't implement scrollTo on Element by default.
if (typeof Element !== "undefined" && !Element.prototype.scrollTo) {
  Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
}

// Polyfill localStorage (Vitest 4's experimental localStorage backing is unset).
function makeStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    get length() { return Object.keys(store).length; },
    clear: () => { store = {}; },
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  } as Storage;
}
Object.defineProperty(window, "localStorage", { value: makeStorage(), configurable: true, writable: true });
Object.defineProperty(window, "sessionStorage", { value: makeStorage(), configurable: true, writable: true });

beforeEach(() => {
  counter = 0;
  try { window.localStorage.clear(); } catch { /* ignore */ }
});

afterEach(() => {
  cleanup();
  clearMocks();
  vi.restoreAllMocks();
});

// Default no-op handler for plugin-dialog so components don't crash if untouched.
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn().mockResolvedValue(null),
  save: vi.fn().mockResolvedValue(null),
}));
