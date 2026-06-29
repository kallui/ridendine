import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QUOTA_LIMIT, QUOTA_WINDOW_MS } from "./config";
import { checkQuota, consumeQuota, quotaExceededResponse, resetMemoryQuota } from "./server";

describe("consumeQuota (memory fallback)", () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    resetMemoryQuota();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetMemoryQuota();
  });

  it("allows requests up to the limit", async () => {
    for (let i = 0; i < QUOTA_LIMIT; i++) {
      const result = await consumeQuota("user-a");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(QUOTA_LIMIT - i - 1);
    }
  });

  it("blocks the request after the limit is reached", async () => {
    for (let i = 0; i < QUOTA_LIMIT; i++) {
      await consumeQuota("user-a");
    }
    const blocked = await consumeQuota("user-a");
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("tracks separate identifiers independently", async () => {
    for (let i = 0; i < QUOTA_LIMIT; i++) {
      await consumeQuota("user-a");
    }
    expect((await consumeQuota("user-a")).allowed).toBe(false);
    expect((await consumeQuota("user-b")).allowed).toBe(true);
  });

  it("sets nextIncreaseAt to oldest request + window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-13T12:00:00Z"));
    const t0 = Date.now();

    await consumeQuota("user-a");
    vi.advanceTimersByTime(5_000);
    const result = await consumeQuota("user-a");

    expect(result.nextIncreaseAt).toBe(t0 + QUOTA_WINDOW_MS);
  });

  it("allows again after the window expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-13T12:00:00Z"));

    for (let i = 0; i < QUOTA_LIMIT; i++) {
      await consumeQuota("user-a");
    }
    expect((await consumeQuota("user-a")).allowed).toBe(false);

    vi.setSystemTime(new Date("2026-06-14T12:00:01Z"));
    expect((await consumeQuota("user-a")).allowed).toBe(true);
  });

  it("restores one slot at a time as requests age out", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-13T00:00:00Z"));

    await consumeQuota("user-a"); // t=0
    vi.advanceTimersByTime(3_600_000); // +1h
    for (let i = 0; i < QUOTA_LIMIT - 1; i++) {
      await consumeQuota("user-a"); // t=1h, uses remaining 4 slots
    }
    expect((await consumeQuota("user-a")).allowed).toBe(false);

    // After 24h from t=0, first slot opens back up
    vi.setSystemTime(new Date("2026-06-14T00:00:01Z"));
    const result = await consumeQuota("user-a");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0); // only 1 slot was freed
  });
});

describe("checkQuota (memory fallback)", () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    resetMemoryQuota();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetMemoryQuota();
  });

  it("returns full quota when no searches have been made", async () => {
    const result = await checkQuota("user-a");
    expect(result.remaining).toBe(QUOTA_LIMIT);
    expect(result.nextIncreaseAt).toBeNull();
  });

  it("does not consume a slot", async () => {
    await checkQuota("user-a");
    await checkQuota("user-a");
    expect((await checkQuota("user-a")).remaining).toBe(QUOTA_LIMIT);
  });

  it("reflects current usage after consumes", async () => {
    await consumeQuota("user-a");
    await consumeQuota("user-a");
    const result = await checkQuota("user-a");
    expect(result.remaining).toBe(QUOTA_LIMIT - 2);
  });
});

describe("quotaExceededResponse", () => {
  it("returns 429 with rate_limit_exceeded and Retry-After", async () => {
    const now = Date.now();
    const response = quotaExceededResponse({
      limit: QUOTA_LIMIT,
      remaining: 0,
      nextIncreaseAt: now + 60_000,
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeTruthy();

    const body = await response.json();
    expect(body.error).toBe("rate_limit_exceeded");
    expect(body.retryAfter).toBeGreaterThanOrEqual(1);
    expect(body.quota.remaining).toBe(0);
  });
});
