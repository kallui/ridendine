import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DAILY_ROUTE_SEARCH_LIMIT } from "@/lib/rate-limit-config";
import {
  checkRouteSearchLimit,
  rateLimitResponse,
  resetMemoryRateLimits,
} from "@/lib/server/rate-limit";

describe("checkRouteSearchLimit (memory fallback)", () => {
  const originalUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalUpstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    resetMemoryRateLimits();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetMemoryRateLimits();
    if (originalUpstashUrl !== undefined) {
      process.env.UPSTASH_REDIS_REST_URL = originalUpstashUrl;
    }
    if (originalUpstashToken !== undefined) {
      process.env.UPSTASH_REDIS_REST_TOKEN = originalUpstashToken;
    }
  });

  it("allows requests up to the daily limit", async () => {
    for (let i = 0; i < DAILY_ROUTE_SEARCH_LIMIT; i++) {
      const result = await checkRouteSearchLimit("user-a");
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(DAILY_ROUTE_SEARCH_LIMIT - i - 1);
    }
  });

  it("blocks the request after the daily limit", async () => {
    for (let i = 0; i < DAILY_ROUTE_SEARCH_LIMIT; i++) {
      await checkRouteSearchLimit("user-a");
    }

    const blocked = await checkRouteSearchLimit("user-a");
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("tracks separate identifiers independently", async () => {
    for (let i = 0; i < DAILY_ROUTE_SEARCH_LIMIT; i++) {
      await checkRouteSearchLimit("user-a");
    }
    const blockedA = await checkRouteSearchLimit("user-a");
    expect(blockedA.success).toBe(false);

    const allowedB = await checkRouteSearchLimit("user-b");
    expect(allowedB.success).toBe(true);
  });

  it("resets after the 24h window expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-13T12:00:00Z"));

    for (let i = 0; i < DAILY_ROUTE_SEARCH_LIMIT; i++) {
      await checkRouteSearchLimit("user-a");
    }
    const blocked = await checkRouteSearchLimit("user-a");
    expect(blocked.success).toBe(false);

    vi.setSystemTime(new Date("2026-06-14T12:00:01Z"));
    const allowed = await checkRouteSearchLimit("user-a");
    expect(allowed.success).toBe(true);
  });
});

describe("rateLimitResponse", () => {
  it("returns 429 with rate_limit_exceeded and Retry-After", async () => {
    const reset = Date.now() + 60_000;
    const response = rateLimitResponse({
      success: false,
      limit: DAILY_ROUTE_SEARCH_LIMIT,
      remaining: 0,
      reset,
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeTruthy();

    const body = await response.json();
    expect(body.error).toBe("rate_limit_exceeded");
    expect(body.action).toBe("route_search");
    expect(body.limit).toBe(DAILY_ROUTE_SEARCH_LIMIT);
    expect(body.retryAfter).toBeGreaterThanOrEqual(1);
  });
});
