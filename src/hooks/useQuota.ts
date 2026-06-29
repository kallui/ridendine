"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SEARCH_COOLDOWN_MS } from "@/lib/rate-limit/config";
import type { QuotaResult } from "@/lib/rate-limit/types";

export type { QuotaResult };

type QuotaState = QuotaResult | null; // null = not yet fetched

export function useQuota() {
  const [quota, setQuota] = useState<QuotaState>(null);
  const [cooldown, setCooldown] = useState(false);
  const cooldownRef = useRef<number | null>(null);
  const increaseTimerRef = useRef<number | null>(null);

  const fetchQuota = useCallback(async () => {
    try {
      const res = await fetch("/api/quota");
      if (!res.ok) return;
      const data = (await res.json()) as QuotaResult;
      setQuota(data);
    } catch {
      // Silently ignore — canSearch stays optimistic while offline.
    }
  }, []);

  // Fetch on mount and whenever the tab regains focus.
  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/quota", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: QuotaResult | null) => {
        if (data) setQuota(data);
      })
      .catch(() => {
        // Silently ignore — canSearch stays optimistic while offline.
      });

    const handleFocus = () => {
      void fetchQuota();
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      controller.abort();
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchQuota]);

  // Schedule a re-fetch exactly when the next slot opens up.
  useEffect(() => {
    if (increaseTimerRef.current !== null) window.clearTimeout(increaseTimerRef.current);
    if (!quota?.nextIncreaseAt) return;

    const delay = Math.max(0, quota.nextIncreaseAt - Date.now()) + 150;
    increaseTimerRef.current = window.setTimeout(() => void fetchQuota(), delay);

    return () => {
      if (increaseTimerRef.current !== null) window.clearTimeout(increaseTimerRef.current);
    };
  }, [quota?.nextIncreaseAt, fetchQuota]);

  // Cleanup cooldown timer on unmount.
  useEffect(() => {
    return () => {
      if (cooldownRef.current !== null) window.clearTimeout(cooldownRef.current);
    };
  }, []);

  /** Call with the quota from a successful directions response. */
  const recordSearch = useCallback((quotaFromServer: QuotaResult) => {
    setQuota(quotaFromServer);
    setCooldown(true);
    if (cooldownRef.current !== null) window.clearTimeout(cooldownRef.current);
    cooldownRef.current = window.setTimeout(() => setCooldown(false), SEARCH_COOLDOWN_MS);
  }, []);

  /** Call with the quota from a 429 response. */
  const markBlocked = useCallback((quotaFromServer: QuotaResult) => {
    setQuota(quotaFromServer);
  }, []);

  return {
    quota,
    cooldown,
    // Optimistic: allow searching while quota hasn't loaded yet (server enforces the limit).
    canSearch: !cooldown && (quota === null || quota.remaining > 0),
    recordSearch,
    markBlocked,
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
  return `Request failed (${response.status})`;
}
