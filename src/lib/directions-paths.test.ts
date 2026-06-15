import { encode } from "@googlemaps/polyline-codec";
import { describe, expect, it } from "vitest";
import {
  buildRoutePath,
  extractPolylineCoordinates,
  getRouteBoundsPoints,
  getRouteEndpoints,
} from "@/lib/directions-paths";

function createStep(
  overrides: Partial<google.maps.DirectionsStep> = {},
): google.maps.DirectionsStep {
  return {
    path: [
      { lat: 40.7, lng: -74.0 },
      { lat: 40.71, lng: -73.99 },
    ],
    ...overrides,
  } as google.maps.DirectionsStep;
}

function createRouteWithSteps(
  steps: google.maps.DirectionsStep[],
): google.maps.DirectionsRoute {
  return {
    legs: [
      {
        steps,
        start_location: { lat: 40.7, lng: -74.0 },
        end_location: { lat: 40.72, lng: -73.98 },
      },
    ],
  } as google.maps.DirectionsRoute;
}

describe("directions-paths", () => {
  it("extracts coordinates from step paths", () => {
    const route = createRouteWithSteps([createStep()]);
    const coords = extractPolylineCoordinates(route);
    expect(coords).toEqual([
      { lat: 40.7, lng: -74.0 },
      { lat: 40.71, lng: -73.99 },
    ]);
  });

  it("decodes encoded polylines when path is missing", () => {
    const encoded = encode([
      [40.7, -74.0],
      [40.71, -73.99],
    ]);
    const route = createRouteWithSteps([
      createStep({ path: undefined, polyline: { points: encoded } }),
    ]);
    const coords = extractPolylineCoordinates(route);
    expect(coords[0]?.lat).toBeCloseTo(40.7, 4);
    expect(coords[1]?.lng).toBeCloseTo(-73.99, 4);
  });

  it("builds a deduplicated route path including leg endpoints", () => {
    const route = createRouteWithSteps([createStep()]);
    const path = buildRoutePath(route);
    expect(path[0]).toEqual({ lat: 40.7, lng: -74.0 });
    expect(path[path.length - 1]).toEqual({ lat: 40.72, lng: -73.98 });
  });

  it("returns route endpoints", () => {
    const route = createRouteWithSteps([createStep()]);
    expect(getRouteEndpoints(route)).toEqual({
      origin: { lat: 40.7, lng: -74.0 },
      destination: { lat: 40.72, lng: -73.98 },
    });
  });

  it("uses overview polyline when leg path is empty", () => {
    const encoded = encode([[40.7, -74.0]]);
    const route = {
      legs: [{ steps: [] }],
      overview_polyline: { points: encoded },
    } as google.maps.DirectionsRoute;
    const bounds = getRouteBoundsPoints(route);
    expect(bounds[0]?.lat).toBeCloseTo(40.7, 4);
  });
});
