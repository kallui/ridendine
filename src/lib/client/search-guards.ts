"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AUTOCOMPLETE_DEBOUNCE_MS,
  DAILY_ROUTE_SEARCH_LIMIT,
} from "@/lib/rate-limit-config";
import {
  canSearchNow,
  incrementSearchCount,
  isDailyLimitReached,
  readSearchCount,
  ROUTE_SEARCH_COOLDOWN_MS,
} from "@/lib/client/search-guards-core";

export { AUTOCOMPLETE_DEBOUNCE_MS };

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

  const dailyLimitReached = isDailyLimitReached(count);
  const canSearch = canSearchNow(count, cooldownActive);

  const recordSearch = useCallback(() => {
    const next = incrementSearchCount(sessionStorage);
    setCount(next);

    setCooldownActive(true);
    if (cooldownRef.current !== null) window.clearTimeout(cooldownRef.current);
    cooldownRef.current = window.setTimeout(() => {
      setCooldownActive(false);
    }, ROUTE_SEARCH_COOLDOWN_MS);
  }, []);

  return {
    canSearch,
    dailyLimitReached,
    count,
    dailyLimit: DAILY_ROUTE_SEARCH_LIMIT,
    recordSearch,
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
