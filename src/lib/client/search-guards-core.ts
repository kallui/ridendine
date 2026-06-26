import {
  DAILY_ROUTE_SEARCH_LIMIT,
  ROUTE_SEARCH_COOLDOWN_MS,
} from "@/lib/rate-limit-config";

export const COUNT_KEY = "rnd_searches";
export const RESET_AT_KEY = "rnd_reset_at";

/** @deprecated Legacy calendar-day key — cleared on read when present. */
const LEGACY_DATE_KEY = "rnd_searches_date";

export function isSearchWindowExpired(
  storage: Storage,
  now = new Date(),
): boolean {
  const resetAt = storage.getItem(RESET_AT_KEY);
  if (!resetAt) return false;
  return Number(resetAt) <= now.getTime();
}

export function clearSearchWindow(storage: Storage): void {
  storage.setItem(COUNT_KEY, "0");
  storage.removeItem(RESET_AT_KEY);
  storage.removeItem(LEGACY_DATE_KEY);
}

/** Drop a leftover reset timestamp when no searches are recorded in this window. */
export function discardOrphanResetAt(storage: Storage, now = new Date()): void {
  if (isSearchWindowExpired(storage, now)) {
    clearSearchWindow(storage);
    return;
  }
  const count = Number.parseInt(storage.getItem(COUNT_KEY) ?? "0", 10);
  if (count === 0) {
    storage.removeItem(RESET_AT_KEY);
  }
}

export function readSearchCount(storage: Storage, now = new Date()): number {
  storage.removeItem(LEGACY_DATE_KEY);

  if (isSearchWindowExpired(storage, now)) {
    clearSearchWindow(storage);
    return 0;
  }

  return Number.parseInt(storage.getItem(COUNT_KEY) ?? "0", 10);
}

export function incrementSearchCount(storage: Storage, now = new Date()): number {
  if (isSearchWindowExpired(storage, now)) {
    clearSearchWindow(storage);
  }

  const next = Number.parseInt(storage.getItem(COUNT_KEY) ?? "0", 10) + 1;
  storage.setItem(COUNT_KEY, String(next));
  return next;
}

export function isDailyLimitReached(count: number): boolean {
  return count >= DAILY_ROUTE_SEARCH_LIMIT;
}

export function canSearchNow(count: number, cooldownActive: boolean): boolean {
  return !isDailyLimitReached(count) && !cooldownActive;
}

export { DAILY_ROUTE_SEARCH_LIMIT, ROUTE_SEARCH_COOLDOWN_MS };
