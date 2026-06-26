import { describe, expect, it } from "vitest";
import {
  canSearchNow,
  clearSearchWindow,
  discardOrphanResetAt,
  COUNT_KEY,
  DAILY_ROUTE_SEARCH_LIMIT,
  incrementSearchCount,
  isDailyLimitReached,
  isSearchWindowExpired,
  readSearchCount,
  RESET_AT_KEY,
  ROUTE_SEARCH_COOLDOWN_MS,
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

  it("resets count when the rolling window has expired", () => {
    const storage = createStorage();
    storage.setItem(COUNT_KEY, "5");
    storage.setItem(RESET_AT_KEY, String(now.getTime() - 1));

    expect(readSearchCount(storage, now)).toBe(0);
    expect(storage.getItem(COUNT_KEY)).toBe("0");
    expect(storage.getItem(RESET_AT_KEY)).toBeNull();
  });

  it("keeps count when the rolling window is still active", () => {
    const storage = createStorage();
    storage.setItem(COUNT_KEY, "3");
    storage.setItem(RESET_AT_KEY, String(now.getTime() + 60_000));

    expect(readSearchCount(storage, now)).toBe(3);
  });

  it("clears legacy calendar-day storage on read", () => {
    const storage = createStorage();
    storage.setItem("rnd_searches_date", "2026-06-12");
    storage.setItem(COUNT_KEY, "2");

    expect(readSearchCount(storage, now)).toBe(2);
    expect(storage.getItem("rnd_searches_date")).toBeNull();
  });

  it("increments the search count within the active window", () => {
    const storage = createStorage();
    storage.setItem(RESET_AT_KEY, String(now.getTime() + 60_000));

    expect(incrementSearchCount(storage, now)).toBe(1);
    expect(incrementSearchCount(storage, now)).toBe(2);
    expect(readSearchCount(storage, now)).toBe(2);
  });

  it("starts a fresh count after the window expires", () => {
    const storage = createStorage();
    storage.setItem(COUNT_KEY, "5");
    storage.setItem(RESET_AT_KEY, String(now.getTime() - 1));

    expect(incrementSearchCount(storage, now)).toBe(1);
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
    expect(ROUTE_SEARCH_COOLDOWN_MS).toBe(3_000);
  });

  it("discards reset timestamps when the search count is zero", () => {
    const storage = createStorage();
    storage.setItem(RESET_AT_KEY, String(now.getTime() + 30_000));

    discardOrphanResetAt(storage, now);

    expect(storage.getItem(RESET_AT_KEY)).toBeNull();
  });

  it("clearSearchWindow removes count and reset timestamp", () => {
    const storage = createStorage();
    storage.setItem(COUNT_KEY, "4");
    storage.setItem(RESET_AT_KEY, String(now.getTime() + 60_000));

    clearSearchWindow(storage);

    expect(storage.getItem(COUNT_KEY)).toBe("0");
    expect(storage.getItem(RESET_AT_KEY)).toBeNull();
    expect(isSearchWindowExpired(storage, now)).toBe(false);
  });
});
