import { describe, expect, it } from "vitest";
import {
  hasGtfsCoverage,
  isWithinBounds,
  resolveCitiesForPoint,
  resolveFeedsForPoint,
} from "@/lib/gtfs-feeds";

describe("gtfs-feeds coverage", () => {
  it("detects Metro Vancouver coverage and resolves TransLink", () => {
    // Near Commercial-Broadway
    const lat = 49.262;
    const lng = -123.069;

    expect(hasGtfsCoverage(lat, lng)).toBe(true);
    expect(resolveCitiesForPoint(lat, lng).map((c) => c.id)).toContain(
      "vancouver",
    );
    expect(resolveFeedsForPoint(lat, lng).map((f) => f.id)).toEqual([
      "translink",
    ]);
  });

  it("detects Seattle coverage", () => {
    const lat = 47.606;
    const lng = -122.332;

    expect(hasGtfsCoverage(lat, lng)).toBe(true);
    expect(resolveFeedsForPoint(lat, lng).map((f) => f.id)).toContain(
      "king-county-metro",
    );
  });

  it("returns no coverage far from curated cities", () => {
    // Rural Montana
    expect(hasGtfsCoverage(46.87, -113.99)).toBe(false);
    expect(resolveFeedsForPoint(46.87, -113.99)).toEqual([]);
  });

  it("does not include New York City", () => {
    // Midtown Manhattan
    expect(hasGtfsCoverage(40.758, -73.985)).toBe(false);
  });

  it("isWithinBounds is inclusive on edges", () => {
    const bounds = {
      north: 10,
      south: 0,
      west: 0,
      east: 10,
    };
    expect(isWithinBounds(0, 0, bounds)).toBe(true);
    expect(isWithinBounds(10, 10, bounds)).toBe(true);
    expect(isWithinBounds(11, 5, bounds)).toBe(false);
  });
});
