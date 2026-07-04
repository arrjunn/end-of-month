// Tiny typed localStorage layer. All v0 persistence lives here: pantry
// SKUs, plan history, payday. Reads from components go through
// useStoreValue (useSyncExternalStore) so SSR hydration stays clean and
// no effects are needed; writes happen in event handlers via writeStore.

import { useSyncExternalStore } from "react";

export const PANTRY_KEY = "eom_pantry_skus";
export const HISTORY_KEY = "eom_plan_history";
export const PAYDAY_KEY = "eom_payday_day";
export const FLINCH_KEY = "eom_flinch_done";

export interface HistoryEntry {
  ts: number;
  budget: number;
  total_cost: number;
  days: number;
}

/** Stable fallbacks so useSyncExternalStore snapshots stay referentially equal. */
export const EMPTY_STRINGS: string[] = [];
export const EMPTY_HISTORY: HistoryEntry[] = [];

const listeners = new Set<() => void>();
// Snapshot cache keyed by raw string, so repeated getSnapshot calls
// return the same object identity (useSyncExternalStore requirement).
const cache = new Map<string, { raw: string | null; value: unknown }>();

export function readStore<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return fallback;
  }
  const cached = cache.get(key);
  if (cached && cached.raw === raw) return cached.value as T;
  let value: T;
  try {
    value = raw != null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    value = fallback;
  }
  cache.set(key, { raw, value });
  return value;
}

export function writeStore<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
  cache.delete(key);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/** Live view of a stored value. Pass a stable fallback (module const). */
export function useStoreValue<T>(key: string, fallback: T): T {
  return useSyncExternalStore(
    subscribe,
    () => readStore(key, fallback),
    () => fallback,
  );
}
