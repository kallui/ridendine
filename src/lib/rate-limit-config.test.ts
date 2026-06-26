import { describe, expect, it } from "vitest";
import {
  DAILY_ROUTE_SEARCH_LIMIT,
  formatCommuteLimitMessage,
  isRouteWithinCommuteLimits,
  MAX_COMMUTE_MINUTES,
  MAX_ROUTE_DISTANCE_KM,
  ROUTE_SEARCH_WINDOW_MS,
} from "@/lib/rate-limit-config";
import { createRoute } from "@/test/fixtures/directions-route";

describe("isRouteWithinCommuteLimits", () => {
  it("allows routes at exactly the max duration and distance", () => {
    const route = createRoute({
      durationSec: MAX_COMMUTE_MINUTES * 60,
      distanceM: MAX_ROUTE_DISTANCE_KM * 1000,
    });
    expect(isRouteWithinCommuteLimits(route)).toBe(true);
  });

  it("rejects routes over the max duration", () => {
    const route = createRoute({
      durationSec: MAX_COMMUTE_MINUTES * 60 + 60,
      distanceM: 10_000,
    });
    expect(isRouteWithinCommuteLimits(route)).toBe(false);
  });

  it("rejects routes over the max distance", () => {
    const route = createRoute({
      durationSec: 1800,
      distanceM: MAX_ROUTE_DISTANCE_KM * 1000 + 100,
    });
    expect(isRouteWithinCommuteLimits(route)).toBe(false);
  });

  it("rejects routes with no legs", () => {
    expect(isRouteWithinCommuteLimits({ legs: [] } as google.maps.DirectionsRoute)).toBe(false);
  });

  it("rejects routes with missing duration", () => {
    const route = createRoute();
    route.legs[0]!.duration = undefined;
    expect(isRouteWithinCommuteLimits(route)).toBe(false);
  });
});

describe("formatCommuteLimitMessage", () => {
  it("includes both commute thresholds", () => {
    const message = formatCommuteLimitMessage();
    expect(message).toContain(String(MAX_COMMUTE_MINUTES));
    expect(message).toContain(String(MAX_ROUTE_DISTANCE_KM));
  });
});

describe("DAILY_ROUTE_SEARCH_LIMIT", () => {
  it("is 5 searches per day", () => {
    expect(DAILY_ROUTE_SEARCH_LIMIT).toBe(5);
  });
});

describe("ROUTE_SEARCH_WINDOW_MS", () => {
  it("defaults to 24 hours", () => {
    expect(ROUTE_SEARCH_WINDOW_MS).toBe(24 * 60 * 60 * 1000);
  });
});
