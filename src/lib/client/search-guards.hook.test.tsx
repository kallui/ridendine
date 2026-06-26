// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DAILY_ROUTE_SEARCH_LIMIT, ROUTE_SEARCH_WINDOW_MS } from "@/lib/rate-limit-config";
import { useRouteSearchGuards } from "@/lib/client/search-guards";

describe("useRouteSearchGuards", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it("starts with canSearch true and no countdown", () => {
    const { result } = renderHook(() => useRouteSearchGuards());
    expect(result.current.canSearch).toBe(true);
    expect(result.current.count).toBe(0);
    expect(result.current.resetAt).toBeNull();
  });

  it("starts the countdown at the full window on the first search", () => {
    vi.setSystemTime(new Date("2026-06-13T12:00:00Z"));
    const { result } = renderHook(() => useRouteSearchGuards());

    act(() => {
      // Server may return a shorter reset when Redis still has a partial window.
      result.current.recordSearch(Date.now() + 30_000);
    });

    expect(result.current.count).toBe(1);
    expect(result.current.resetAt).toBe(Date.now() + ROUTE_SEARCH_WINDOW_MS);
  });

  it("ignores stale reset timestamps when no searches are recorded", () => {
    sessionStorage.setItem("rnd_reset_at", String(Date.now() + 30_000));

    const { result } = renderHook(() => useRouteSearchGuards());

    expect(result.current.count).toBe(0);
    expect(result.current.resetAt).toBeNull();
    expect(sessionStorage.getItem("rnd_reset_at")).toBeNull();
  });

  it("disables search during cooldown after recordSearch", () => {
    const { result } = renderHook(() => useRouteSearchGuards());

    act(() => {
      result.current.recordSearch();
    });

    expect(result.current.canSearch).toBe(false);
    expect(result.current.count).toBe(1);
  });

  it("re-enables search after the cooldown expires", () => {
    const { result } = renderHook(() => useRouteSearchGuards());

    act(() => {
      result.current.recordSearch();
    });
    expect(result.current.canSearch).toBe(false);

    act(() => {
      vi.advanceTimersByTime(8_000);
    });
    expect(result.current.canSearch).toBe(true);
  });

  it("blocks search when the daily limit is reached", () => {
    const { result } = renderHook(() => useRouteSearchGuards());

    act(() => {
      for (let i = 0; i < DAILY_ROUTE_SEARCH_LIMIT; i++) {
        result.current.recordSearch();
        vi.advanceTimersByTime(8_000);
      }
      result.current.syncResetAt(Date.now() + 60_000);
    });

    expect(result.current.dailyLimitReached).toBe(true);
    expect(result.current.canSearch).toBe(false);
  });

  it("clears the count when the rolling window expires", () => {
    const { result } = renderHook(() => useRouteSearchGuards());

    act(() => {
      for (let i = 0; i < DAILY_ROUTE_SEARCH_LIMIT; i++) {
        result.current.recordSearch();
        vi.advanceTimersByTime(8_000);
      }
      result.current.syncResetAt(Date.now() + 60_000);
    });

    expect(result.current.dailyLimitReached).toBe(true);

    act(() => {
      vi.advanceTimersByTime(60_001);
    });

    expect(result.current.count).toBe(0);
    expect(result.current.dailyLimitReached).toBe(false);
    expect(result.current.canSearch).toBe(true);
    expect(sessionStorage.getItem("rnd_reset_at")).toBeNull();
  });
});
