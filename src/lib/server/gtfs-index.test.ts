import { describe, expect, it } from "vitest";
import {
  deserializeGtfsIndex,
  GTFS_INDEX_VERSION,
  serializeGtfsIndex,
} from "./gtfs";

describe("cooked GTFS index JSON", () => {
  const sample = {
    v: GTFS_INDEX_VERSION,
    stops: {
      "123": { lat: 49.2827, lng: -123.1207, name: "Waterfront Stn" },
    },
    routesByShortName: { "Expo Line": ["99618"] },
    routeStops: { "99618": { "0": [["123", "124"]], "1": [["124", "123"]] } },
  };

  it("round-trips Maps and direction ids", () => {
    const idx = deserializeGtfsIndex(sample);
    expect(idx.stops.get("123")?.name).toBe("Waterfront Stn");
    expect(idx.routesByShortName.get("Expo Line")).toEqual(["99618"]);
    expect(idx.routeStops.get("99618")?.get(0)?.[0]).toEqual(["123", "124"]);
    expect(idx.routeStops.get("99618")?.get(1)?.[0]).toEqual(["124", "123"]);
    expect(serializeGtfsIndex(idx)).toEqual(sample);
  });

  it("rejects missing or outdated version", () => {
    expect(() => deserializeGtfsIndex({ ...sample, v: 2 })).toThrow(/outdated/);
    expect(() => deserializeGtfsIndex({ ...sample, v: undefined })).toThrow(
      /outdated/,
    );
  });
});
