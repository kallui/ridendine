import {
  DAILY_ROUTE_SEARCH_LIMIT,
  ROUTE_SEARCH_COOLDOWN_MS,
} from "@/lib/rate-limit-config";

export const COUNT_KEY = "rnd_searches";
export const DATE_KEY = "rnd_searches_date";

export function todayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function readSearchCount(storage: Storage, now = new Date()): number {
  if (storage.getItem(DATE_KEY) !== todayKey(now)) {
    storage.setItem(DATE_KEY, todayKey(now));
    storage.setItem(COUNT_KEY, "0");
    return 0;
  }
  return Number.parseInt(storage.getItem(COUNT_KEY) ?? "0", 10);
}

export function incrementSearchCount(storage: Storage, now = new Date()): number {
  const next = readSearchCount(storage, now) + 1;
  storage.setItem(COUNT_KEY, String(next));
  storage.setItem(DATE_KEY, todayKey(now));
  return next;
}

export function isDailyLimitReached(count: number): boolean {
  return count >= DAILY_ROUTE_SEARCH_LIMIT;
}

export function canSearchNow(count: number, cooldownActive: boolean): boolean {
  return !isDailyLimitReached(count) && !cooldownActive;
}

export { DAILY_ROUTE_SEARCH_LIMIT, ROUTE_SEARCH_COOLDOWN_MS };
