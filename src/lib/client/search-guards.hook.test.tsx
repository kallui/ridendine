// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DAILY_ROUTE_SEARCH_LIMIT } from "@/lib/client/search-guards-core";
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

  it("starts with canSearch true", () => {
    const { result } = renderHook(() => useRouteSearchGuards());
    expect(result.current.canSearch).toBe(true);
    expect(result.current.count).toBe(0);
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
    });

    expect(result.current.dailyLimitReached).toBe(true);
    expect(result.current.canSearch).toBe(false);
  });
});
