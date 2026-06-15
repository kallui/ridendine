import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DAILY_ROUTE_SEARCH_LIMIT } from "@/lib/rate-limit-config";
import { resetMemoryRateLimits } from "@/lib/server/rate-limit";
import { createDirectionsApiResponse } from "@/test/fixtures/directions-api-response";
import { createJsonRequest } from "@/test/fixtures/request-helpers";

const fetchDirections = vi.fn();
const getOrCreateSessionId = vi.fn();
const getClientIp = vi.fn();

vi.mock("@/lib/server/google-maps", () => ({
  fetchDirections: (...args: unknown[]) => fetchDirections(...args),
}));

vi.mock("@/lib/server/session", () => ({
  getOrCreateSessionId: (...args: unknown[]) => getOrCreateSessionId(...args),
  getClientIp: (...args: unknown[]) => getClientIp(...args),
}));

import { POST } from "@/app/api/directions/route";

describe("POST /api/directions sequential rate limit", () => {
  const originalUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalUpstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    resetMemoryRateLimits();
    vi.clearAllMocks();
    getOrCreateSessionId.mockResolvedValue("session-abc");
    getClientIp.mockReturnValue("10.0.0.1");
    fetchDirections.mockResolvedValue(createDirectionsApiResponse());
  });

  afterEach(() => {
    resetMemoryRateLimits();
    if (originalUpstashUrl !== undefined) {
      process.env.UPSTASH_REDIS_REST_URL = originalUpstashUrl;
    }
    if (originalUpstashToken !== undefined) {
      process.env.UPSTASH_REDIS_REST_TOKEN = originalUpstashToken;
    }
  });

  it(`allows ${DAILY_ROUTE_SEARCH_LIMIT} searches then returns 429`, async () => {
    const body = { origin: "A", destination: "B" };

    for (let i = 0; i < DAILY_ROUTE_SEARCH_LIMIT; i++) {
      const response = await POST(createJsonRequest("http://test/api/directions", body));
      expect(response.status).toBe(200);
    }

    const blocked = await POST(createJsonRequest("http://test/api/directions", body));
    expect(blocked.status).toBe(429);
    const payload = await blocked.json();
    expect(payload.error).toBe("rate_limit_exceeded");
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });
});
