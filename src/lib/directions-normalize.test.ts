import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  getStepTransit,
  isTransitStep,
  normalizeDirectionsResult,
} from "@/lib/directions-normalize";
import { createRoute } from "@/test/fixtures/directions-route";

beforeAll(() => {
  vi.stubGlobal("google", {
    maps: {
      TravelMode: {
        TRANSIT: "TRANSIT",
        WALKING: "WALKING",
      },
    },
  });
});

describe("directions-normalize", () => {
  it("normalizes REST directions into a JS DirectionsResult shape", () => {
    const route = createRoute({
      steps: [
        {
          travel_mode: google.maps.TravelMode.TRANSIT,
          transit_details: { line: { short_name: "M1" } },
        } as google.maps.DirectionsStep,
      ],
    });

    const result = normalizeDirectionsResult(
      { status: "OK", routes: [route] },
      { origin: "Origin", destination: "Destination" },
    );

    expect(result.request.travelMode).toBe(google.maps.TravelMode.TRANSIT);
    expect(result.request.provideRouteAlternatives).toBe(true);
    expect(result.routes[0]?.legs[0]?.steps[0]?.transit).toEqual({
      line: { short_name: "M1" },
    });
  });

  it("reads transit details from either js or rest step shape", () => {
    const jsStep = {
      transit: { line: { short_name: "A" } },
    } as google.maps.DirectionsStep;
    const restStep = {
      transit_details: { line: { short_name: "B" } },
    } as google.maps.DirectionsStep;

    expect(getStepTransit(jsStep)).toEqual({ line: { short_name: "A" } });
    expect(getStepTransit(restStep)).toEqual({ line: { short_name: "B" } });
  });

  it("detects transit steps", () => {
    const step = { travel_mode: google.maps.TravelMode.TRANSIT } as google.maps.DirectionsStep;
    expect(isTransitStep(step)).toBe(true);
    expect(
      isTransitStep({ travel_mode: google.maps.TravelMode.WALKING } as google.maps.DirectionsStep),
    ).toBe(false);
  });
});
