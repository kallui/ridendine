import { describe, expect, it } from "vitest";
import { computeSearchPoints } from "@/lib/route-sampling";

describe("computeSearchPoints", () => {
  const config = { searchIntervalKm: 2, apiSearchRadiusM: 1300 };

  it("returns at least one point for a short route", () => {
    const polyline = [
      { lat: 40.7128, lng: -74.006 },
      { lat: 40.72, lng: -74.0 },
      { lat: 40.73, lng: -73.99 },
    ];
    const points = computeSearchPoints(polyline, config);
    expect(points.length).toBeGreaterThanOrEqual(1);
  });

  it("deduplicates centers that are too close together", () => {
    const polyline = [
      { lat: 40.0, lng: -74.0 },
      { lat: 40.0001, lng: -74.0001 },
      { lat: 40.0002, lng: -74.0002 },
    ];
    const points = computeSearchPoints(polyline, config);
    expect(points.length).toBe(1);
  });

  it("returns a fallback point when sampling yields no centers", () => {
    const polyline = [
      { lat: 40.0, lng: -74.0 },
      { lat: 40.0, lng: -74.0 },
    ];
    const points = computeSearchPoints(polyline, config);
    expect(points).toHaveLength(1);
    expect(points[0]?.lat).toBeCloseTo(40.0, 4);
  });
});
