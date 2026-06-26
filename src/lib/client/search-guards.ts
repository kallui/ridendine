"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AUTOCOMPLETE_DEBOUNCE_MS,
  DAILY_ROUTE_SEARCH_LIMIT,
  ROUTE_SEARCH_WINDOW_MS,
} from "@/lib/rate-limit-config";
import {
  canSearchNow,
  clearSearchWindow,
  COUNT_KEY,
  discardOrphanResetAt,
  incrementSearchCount,
  isDailyLimitReached,
  isSearchWindowExpired,
  readSearchCount,
  RESET_AT_KEY,
  ROUTE_SEARCH_COOLDOWN_MS,
} from "@/lib/client/search-guards-core";

export { AUTOCOMPLETE_DEBOUNCE_MS };

// Mirror of server-side DISABLE_RATE_LIMIT — set NEXT_PUBLIC_DISABLE_RATE_LIMIT=true
// in .env.local to remove the client-side counter during development.
const DEV_BYPASS =
  process.env.NEXT_PUBLIC_DISABLE_RATE_LIMIT === "true";

function applyExpiredWindow(
  storage: Storage,
  setCount: (n: number) => void,
  setResetAt: (n: number | null) => void,
) {
  if (!isSearchWindowExpired(storage)) return false;
  clearSearchWindow(storage);
  setCount(0);
  setResetAt(null);
  return true;
}

export function useRouteSearchGuards() {
  const [count, setCount] = useState(0);
  const [cooldownActive, setCooldownActive] = useState(false);
  const [resetAt, setResetAt] = useState<number | null>(null);
  const cooldownRef = useRef<number | null>(null);

  // Runs only on the client after hydration — sessionStorage is not available on the server.
  useEffect(() => {
    const storage = sessionStorage;
    if (applyExpiredWindow(storage, setCount, setResetAt)) return;

    discardOrphanResetAt(storage);
    const count = readSearchCount(storage);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCount(count);
    if (count === 0) {
      setResetAt(null);
    } else {
      const stored = storage.getItem(RESET_AT_KEY);
      if (stored) setResetAt(Number(stored));
    }
  }, []);

  // Clear count and re-enable search when the rolling window expires.
  useEffect(() => {
    if (!resetAt || DEV_BYPASS) return;

    const storage = sessionStorage;
    const scheduleClear = () => {
      if (applyExpiredWindow(storage, setCount, setResetAt)) return;
      const delay = Math.max(0, resetAt - Date.now());
      return window.setTimeout(() => {
        applyExpiredWindow(storage, setCount, setResetAt);
      }, delay);
    };

    if (resetAt <= Date.now()) {
      applyExpiredWindow(storage, setCount, setResetAt);
      return;
    }

    const timeoutId = scheduleClear();
    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [resetAt]);

  useEffect(() => {
    return () => {
      if (cooldownRef.current !== null) window.clearTimeout(cooldownRef.current);
    };
  }, []);

  const dailyLimitReached = !DEV_BYPASS && isDailyLimitReached(count);
  const canSearch = !dailyLimitReached && !cooldownActive;

  const syncResetAt = useCallback((resetMs: number) => {
    if (DEV_BYPASS) return;
    sessionStorage.setItem(RESET_AT_KEY, String(resetMs));
    setResetAt(resetMs);
  }, []);

  const recordSearch = useCallback(
    (serverResetMs?: number) => {
      if (DEV_BYPASS) return;
      const wasFirstInWindow = readSearchCount(sessionStorage) === 0;
      const next = incrementSearchCount(sessionStorage);
      setCount(next);

      if (wasFirstInWindow) {
        syncResetAt(Date.now() + ROUTE_SEARCH_WINDOW_MS);
      } else if (serverResetMs != null) {
        syncResetAt(serverResetMs);
      }

      setCooldownActive(true);
      if (cooldownRef.current !== null) window.clearTimeout(cooldownRef.current);
      cooldownRef.current = window.setTimeout(() => {
        setCooldownActive(false);
      }, ROUTE_SEARCH_COOLDOWN_MS);
    },
    [syncResetAt],
  );

  /**
   * Call this when the server returns 429 so the client counter syncs to
   * the limit immediately, instead of drifting below the real server value.
   * Pass retryAfterSec from the Retry-After response to store the reset time.
   */
  const markLimitReached = useCallback(
    (retryAfterSec?: number) => {
      if (DEV_BYPASS) return;
      sessionStorage.setItem(COUNT_KEY, String(DAILY_ROUTE_SEARCH_LIMIT));
      setCount(DAILY_ROUTE_SEARCH_LIMIT);
      const resetMs =
        retryAfterSec != null
          ? Date.now() + retryAfterSec * 1000
          : Date.now() + ROUTE_SEARCH_WINDOW_MS;
      syncResetAt(resetMs);
    },
    [syncResetAt],
  );

  return {
    canSearch,
    dailyLimitReached,
    count,
    dailyLimit: DEV_BYPASS ? 0 : DAILY_ROUTE_SEARCH_LIMIT,
    resetAt,
    recordSearch,
    markLimitReached,
    syncResetAt,
  };
}

export async function parseApiError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { message?: string; error?: string };
    if (data.message) return data.message;
    if (data.error) return data.error;
  } catch {
    // fall through
  }
  if (response.status === 429) {
    return `Daily limit reached (${DAILY_ROUTE_SEARCH_LIMIT}/${DAILY_ROUTE_SEARCH_LIMIT} searches). Try again when the timer resets.`;
  }
  return `Request failed (${response.status})`;
}
