import { describe, expect, it } from "vitest";
import {
  GTFS_CITIES,
  hasGtfsCoverage,
  isWithinBounds,
  resolveCitiesForPoint,
  resolveFeedsForPoint,
} from "@/lib/gtfs-feeds";

describe("gtfs-feeds coverage", () => {
  it("includes the planned North America metro set only", () => {
    expect(GTFS_CITIES.map((c) => c.id)).toEqual([
      "vancouver",
      "toronto",
      "montreal",
      "seattle",
      "portland",
      "chicago",
      "boston",
      "denver",
      "austin",
    ]);
  });

  it("detects Metro Vancouver coverage and resolves TransLink", () => {
    // Near Commercial-Broadway (Vancouver)
    const lat = 49.262;
    const lng = -123.069;

    expect(hasGtfsCoverage(lat, lng)).toBe(true);
    expect(resolveCitiesForPoint(lat, lng).map((c) => c.id)).toEqual([
      "vancouver",
    ]);
    expect(resolveFeedsForPoint(lat, lng).map((f) => f.id)).toEqual([
      "translink",
    ]);
  });

  it("covers other Metro Vancouver municipalities via the same feed", () => {
    // Richmond City Centre area
    expect(hasGtfsCoverage(49.166, -123.136)).toBe(true);
    // Metrotown / Burnaby
    expect(hasGtfsCoverage(49.226, -123.002)).toBe(true);
    expect(resolveFeedsForPoint(49.166, -123.136).map((f) => f.id)).toEqual([
      "translink",
    ]);
  });

  it("resolves planned metros for local testing", () => {
    expect(resolveFeedsForPoint(43.653, -79.383).map((f) => f.id)).toEqual([
      "ttc",
    ]);
    expect(resolveFeedsForPoint(47.606, -122.332).map((f) => f.id)).toEqual([
      "sound-transit",
      "king-county-metro",
    ]);
    // Bellevue Transit Center — Eastside inside expanded Seattle bounds
    expect(resolveFeedsForPoint(47.6153, -122.1925).map((f) => f.id)).toEqual([
      "sound-transit",
      "king-county-metro",
    ]);
    expect(resolveFeedsForPoint(45.515, -122.679).map((f) => f.id)).toEqual([
      "trimet",
    ]);
    // Littleton–Mineral Station — southwest rail suburb inside Denver bounds
    expect(resolveFeedsForPoint(39.5804, -105.0248).map((f) => f.id)).toEqual([
      "rtd",
    ]);
  });

  it("returns no coverage outside registered metros", () => {
    // Rural Montana
    expect(hasGtfsCoverage(46.87, -113.99)).toBe(false);
    expect(resolveFeedsForPoint(46.87, -113.99)).toEqual([]);
  });

  it("does not include New York City, LA, or Jakarta", () => {
    expect(hasGtfsCoverage(40.758, -73.985)).toBe(false);
    expect(hasGtfsCoverage(-6.208, 106.845)).toBe(false);
    expect(GTFS_CITIES.some((c) => c.id === "jakarta")).toBe(false);
    expect(GTFS_CITIES.some((c) => c.id === "los-angeles")).toBe(false);
    expect(GTFS_CITIES.some((c) => c.id === "new-york")).toBe(false);
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
