import type { WaypointInput } from "@/lib/places-types";

type RestDirectionsPayload = {
  status: string;
  routes: google.maps.DirectionsRoute[];
  geocoded_waypoints?: google.maps.DirectionsGeocodedWaypoint[];
};

type RestDirectionsStep = google.maps.DirectionsStep & {
  transit_details?: google.maps.TransitDetails;
};

/**
 * REST Directions JSON is close to the JS DirectionsResult shape, but misses
 * fields DirectionsRenderer and our UI expect (request.travelMode, step.transit).
 */
export function normalizeDirectionsResult(
  data: RestDirectionsPayload,
  waypoints: { origin: WaypointInput; destination: WaypointInput },
): google.maps.DirectionsResult {
  return {
    routes: data.routes.map(normalizeRoute),
    geocoded_waypoints: data.geocoded_waypoints,
    request: {
      origin: waypoints.origin as google.maps.DirectionsRequest["origin"],
      destination:
        waypoints.destination as google.maps.DirectionsRequest["destination"],
      travelMode: google.maps.TravelMode.TRANSIT,
      provideRouteAlternatives: true,
    },
  };
}

function normalizeRoute(
  route: google.maps.DirectionsRoute,
): google.maps.DirectionsRoute {
  return {
    ...route,
    legs: route.legs.map((leg) => ({
      ...leg,
      steps: leg.steps.map(normalizeStep),
    })),
  };
}

function normalizeStep(step: RestDirectionsStep): google.maps.DirectionsStep {
  return {
    ...step,
    transit: step.transit ?? step.transit_details,
  };
}

/** Read transit details from either JS or REST step shape. */
export function getStepTransit(
  step: google.maps.DirectionsStep,
): google.maps.TransitDetails | undefined {
  const restStep = step as RestDirectionsStep;
  return step.transit ?? restStep.transit_details;
}

export function isTransitStep(step: google.maps.DirectionsStep): boolean {
  return step.travel_mode === google.maps.TravelMode.TRANSIT;
}
