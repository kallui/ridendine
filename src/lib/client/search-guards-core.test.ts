import { describe, expect, it } from "vitest";
import {
  canSearchNow,
  DAILY_ROUTE_SEARCH_LIMIT,
  incrementSearchCount,
  isDailyLimitReached,
  readSearchCount,
  ROUTE_SEARCH_COOLDOWN_MS,
  todayKey,
} from "@/lib/client/search-guards-core";

function createStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  };
}

describe("search-guards-core", () => {
  const now = new Date("2026-06-13T10:00:00Z");

  it("returns today's date key", () => {
    expect(todayKey(now)).toBe("2026-06-13");
  });

  it("resets count when the stored date changes", () => {
    const storage = createStorage();
    storage.setItem("rnd_searches_date", "2026-06-12");
    storage.setItem("rnd_searches", "5");

    expect(readSearchCount(storage, now)).toBe(0);
    expect(storage.getItem("rnd_searches_date")).toBe("2026-06-13");
  });

  it("increments the daily search count", () => {
    const storage = createStorage();
    expect(incrementSearchCount(storage, now)).toBe(1);
    expect(incrementSearchCount(storage, now)).toBe(2);
    expect(readSearchCount(storage, now)).toBe(2);
  });

  it("detects when the daily limit is reached", () => {
    expect(isDailyLimitReached(DAILY_ROUTE_SEARCH_LIMIT - 1)).toBe(false);
    expect(isDailyLimitReached(DAILY_ROUTE_SEARCH_LIMIT)).toBe(true);
  });

  it("blocks search during cooldown or at daily limit", () => {
    expect(canSearchNow(0, false)).toBe(true);
    expect(canSearchNow(0, true)).toBe(false);
    expect(canSearchNow(DAILY_ROUTE_SEARCH_LIMIT, false)).toBe(false);
  });

  it("exports the configured cooldown duration", () => {
    expect(ROUTE_SEARCH_COOLDOWN_MS).toBe(8_000);
  });
});
