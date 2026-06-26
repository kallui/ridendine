import { beforeEach, describe, expect, it, vi } from "vitest";
import { DAILY_ROUTE_SEARCH_LIMIT, ROUTE_SEARCH_WINDOW_MS } from "@/lib/rate-limit-config";
import { createDirectionsApiFailure, createDirectionsApiResponse } from "@/test/fixtures/directions-api-response";
import { createLongRoute, createRoute } from "@/test/fixtures/directions-route";
import { createJsonRequest } from "@/test/fixtures/request-helpers";

const fetchDirections = vi.fn();
const checkRouteSearchLimit = vi.fn();
const rateLimitResponse = vi.fn();
const getOrCreateSessionId = vi.fn();
const getClientIp = vi.fn();

vi.mock("@/lib/server/google-maps", () => ({
  fetchDirections: (...args: unknown[]) => fetchDirections(...args),
}));

vi.mock("@/lib/server/rate-limit", () => ({
  checkRouteSearchLimit: (...args: unknown[]) => checkRouteSearchLimit(...args),
  rateLimitResponse: (...args: unknown[]) => rateLimitResponse(...args),
}));

vi.mock("@/lib/server/session", () => ({
  getOrCreateSessionId: (...args: unknown[]) => getOrCreateSessionId(...args),
  getClientIp: (...args: unknown[]) => getClientIp(...args),
}));

import { POST } from "@/app/api/directions/route";

describe("POST /api/directions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOrCreateSessionId.mockResolvedValue("session-123");
    getClientIp.mockReturnValue("1.2.3.4");
    checkRouteSearchLimit.mockResolvedValue({
      success: true,
      limit: DAILY_ROUTE_SEARCH_LIMIT,
      remaining: DAILY_ROUTE_SEARCH_LIMIT - 1,
      reset: Date.now() + ROUTE_SEARCH_WINDOW_MS,
    });
    fetchDirections.mockResolvedValue(createDirectionsApiResponse());
    rateLimitResponse.mockImplementation(() =>
      Response.json(
        { error: "rate_limit_exceeded", retryAfter: 3600 },
        { status: 429, headers: { "Retry-After": "3600" } },
      ),
    );
  });

  it("returns 400 for invalid json", async () => {
    const request = new Request("http://test/api/directions", {
      method: "POST",
      body: "not-json",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_json" });
  });

  it("returns 400 when origin or destination is missing", async () => {
    const response = await POST(
      createJsonRequest("http://test/api/directions", { origin: "A" }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("missing_fields");
  });

  it("returns 429 when rate limit is exceeded", async () => {
    checkRouteSearchLimit.mockResolvedValue({
      success: false,
      limit: DAILY_ROUTE_SEARCH_LIMIT,
      remaining: 0,
      reset: Date.now() + ROUTE_SEARCH_WINDOW_MS,
    });

    const response = await POST(
      createJsonRequest("http://test/api/directions", {
        origin: "Origin",
        destination: "Destination",
      }),
    );

    expect(rateLimitResponse).toHaveBeenCalledOnce();
    expect(response.status).toBe(429);
  });

  it("returns 502 when directions api fails", async () => {
    fetchDirections.mockResolvedValue(createDirectionsApiFailure());

    const response = await POST(
      createJsonRequest("http://test/api/directions", {
        origin: "Origin",
        destination: "Destination",
      }),
    );

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error).toBe("directions_failed");
  });

  it("returns 422 when all routes exceed commute limits", async () => {
    fetchDirections.mockResolvedValue(
      createDirectionsApiResponse(createLongRoute()),
    );

    const response = await POST(
      createJsonRequest("http://test/api/directions", {
        origin: "Origin",
        destination: "Destination",
      }),
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe("route_too_long");
  });

  it("returns 200 with commute-filtered routes on success", async () => {
    const shortRoute = createRoute();
    const longRoute = createLongRoute();
    fetchDirections.mockResolvedValue({
      status: "OK",
      routes: [shortRoute, longRoute],
    });

    const response = await POST(
      createJsonRequest("http://test/api/directions", {
        origin: "Origin",
        destination: "Destination",
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.routes).toHaveLength(1);
    expect(body.routes[0]).toEqual(shortRoute);
    expect(body.rateLimitReset).toBeGreaterThan(Date.now());
    expect(checkRouteSearchLimit).toHaveBeenCalledWith("1.2.3.4:session-123");
  });
});
