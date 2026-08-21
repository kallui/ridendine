import { describe, expect, it } from "vitest";
import { formatAlightHint, formatTransitLineLabel } from "./alight-hint";

describe("formatTransitLineLabel", () => {
  it("adds direction when headsign is present", () => {
    expect(
      formatTransitLineLabel({
        routeShortName: "Expo Line",
        headsign: "Waterfront",
      }),
    ).toBe("Expo Line (Waterfront)");
  });

  it("prefixes numeric bus routes", () => {
    expect(
      formatTransitLineLabel({
        routeShortName: "49",
        headsign: "UBC",
        vehicleType: "BUS",
      }),
    ).toBe("Bus 49 (UBC)");
  });

  it("does not prefix named lines", () => {
    expect(
      formatTransitLineLabel({
        routeShortName: "Expo Line",
        vehicleType: "SUBWAY",
      }),
    ).toBe("Expo Line");
  });
});

describe("formatAlightHint", () => {
  it("returns null without a stop name", () => {
    expect(formatAlightHint("", 0, [{ routeShortName: "99" }])).toBeNull();
  });

  it("uses get-off-only copy when no line names exist", () => {
    expect(formatAlightHint("Joyce St", 0, [{}])).toBe(
      "Get off at Joyce St",
    );
  });

  it("formats a single line", () => {
    expect(
      formatAlightHint("Joyce St", 0, [{ routeShortName: "Expo Line" }]),
    ).toBe("Take Expo Line · get off at Joyce St");
  });

  it("includes direction on each unique line", () => {
    const stops = [
      {
        routeShortName: "Expo Line",
        headsign: "Waterfront",
        vehicleType: "SUBWAY",
      },
      {
        routeShortName: "Expo Line",
        headsign: "Waterfront",
        vehicleType: "SUBWAY",
      },
      { routeShortName: "49", headsign: "UBC", vehicleType: "BUS" },
    ];
    expect(formatAlightHint("Dunbar Loop", 2, stops)).toBe(
      "Take Expo Line (Waterfront), then Bus 49 (UBC) · get off at Dunbar Loop",
    );
  });

  it("joins more than two unique lines", () => {
    const stops = [
      { routeShortName: "Canada Line" },
      { routeShortName: "Expo Line" },
      { routeShortName: "49" },
    ];
    expect(formatAlightHint("UBC", 2, stops)).toBe(
      "Take Canada Line, then Expo Line, then 49 · get off at UBC",
    );
  });

  it("does not treat the origin address as a get-off stop", () => {
    const stops = [
      { endpointKind: "origin" as const },
      { routeShortName: "9" },
    ];
    expect(formatAlightHint("2184 W Broadway", 0, stops)).toBe(
      "Near your start",
    );
  });

  it("does not treat the destination address as a get-off stop", () => {
    const stops = [
      { routeShortName: "Expo Line" },
      { endpointKind: "destination" as const },
    ];
    expect(formatAlightHint("2184 W Broadway", 1, stops)).toBe(
      "Take Expo Line · near your destination",
    );
  });
});
