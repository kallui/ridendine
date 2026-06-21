"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AUTOCOMPLETE_DEBOUNCE_MS,
  DAILY_ROUTE_SEARCH_LIMIT,
} from "@/lib/rate-limit-config";
import {
  canSearchNow,
  COUNT_KEY,
  DATE_KEY,
  incrementSearchCount,
  isDailyLimitReached,
  readSearchCount,
  ROUTE_SEARCH_COOLDOWN_MS,
  todayKey,
} from "@/lib/client/search-guards-core";

export { AUTOCOMPLETE_DEBOUNCE_MS };

// Mirror of server-side DISABLE_RATE_LIMIT — set NEXT_PUBLIC_DISABLE_RATE_LIMIT=true
// in .env.local to remove the client-side counter during development.
const DEV_BYPASS =
  process.env.NEXT_PUBLIC_DISABLE_RATE_LIMIT === "true";

export function useRouteSearchGuards() {
  const [count, setCount] = useState(0);
  const [cooldownActive, setCooldownActive] = useState(false);
  const cooldownRef = useRef<number | null>(null);

  // Runs only on the client after hydration — sessionStorage is not available on the server.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCount(readSearchCount(sessionStorage));
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownRef.current !== null) window.clearTimeout(cooldownRef.current);
    };
  }, []);

  const dailyLimitReached = !DEV_BYPASS && isDailyLimitReached(count);
  const canSearch = !dailyLimitReached && !cooldownActive;

  const recordSearch = useCallback(() => {
    if (DEV_BYPASS) return;
    const next = incrementSearchCount(sessionStorage);
    setCount(next);

    setCooldownActive(true);
    if (cooldownRef.current !== null) window.clearTimeout(cooldownRef.current);
    cooldownRef.current = window.setTimeout(() => {
      setCooldownActive(false);
    }, ROUTE_SEARCH_COOLDOWN_MS);
  }, []);

  /**
   * Call this when the server returns 429 so the client counter syncs to
   * the limit immediately, instead of drifting below the real server value.
   */
  const markLimitReached = useCallback(() => {
    if (DEV_BYPASS) return;
    sessionStorage.setItem(COUNT_KEY, String(DAILY_ROUTE_SEARCH_LIMIT));
    sessionStorage.setItem(DATE_KEY, todayKey());
    setCount(DAILY_ROUTE_SEARCH_LIMIT);
  }, []);

  return {
    canSearch,
    dailyLimitReached,
    count,
    dailyLimit: DEV_BYPASS ? 0 : DAILY_ROUTE_SEARCH_LIMIT,
    recordSearch,
    markLimitReached,
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
    return `Daily limit reached (${DAILY_ROUTE_SEARCH_LIMIT}/${DAILY_ROUTE_SEARCH_LIMIT} today). Resets tomorrow.`;
  }
  return `Request failed (${response.status})`;
}
