"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AUTOCOMPLETE_DEBOUNCE_MS,
  DAILY_ROUTE_SEARCH_LIMIT,
  ROUTE_SEARCH_COOLDOWN_MS,
} from "@/lib/rate-limit-config";

export { AUTOCOMPLETE_DEBOUNCE_MS };

const COUNT_KEY = "rnd_searches";
const DATE_KEY = "rnd_searches_date";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readCount(): number {
  if (typeof window === "undefined") return 0;
  if (sessionStorage.getItem(DATE_KEY) !== todayKey()) {
    sessionStorage.setItem(DATE_KEY, todayKey());
    sessionStorage.setItem(COUNT_KEY, "0");
    return 0;
  }
  return Number.parseInt(sessionStorage.getItem(COUNT_KEY) ?? "0", 10);
}

export function useRouteSearchGuards() {
  const [count, setCount] = useState(0);
  const [cooldownActive, setCooldownActive] = useState(false);
  const cooldownRef = useRef<number | null>(null);

  useEffect(() => {
    setCount(readCount());
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownRef.current !== null) window.clearTimeout(cooldownRef.current);
    };
  }, []);

  const dailyLimitReached = count >= DAILY_ROUTE_SEARCH_LIMIT;
  const canSearch = !dailyLimitReached && !cooldownActive;

  const recordSearch = useCallback(() => {
    const next = readCount() + 1;
    sessionStorage.setItem(COUNT_KEY, String(next));
    sessionStorage.setItem(DATE_KEY, todayKey());
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
  if (response.status === 429) return `Daily limit reached (${DAILY_ROUTE_SEARCH_LIMIT}/${DAILY_ROUTE_SEARCH_LIMIT} today). Resets tomorrow.`;
  return `Request failed (${response.status})`;
}
