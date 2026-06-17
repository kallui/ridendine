import { decode } from "@googlemaps/polyline-codec";
import { isTransitStep, getStepTransit } from "@/lib/directions-normalize";

export function extractPolylineCoordinates(
  route: google.maps.DirectionsRoute,
): google.maps.LatLngLiteral[] {
  return route.legs
    .flatMap((leg) => leg.steps)
    .flatMap((step) => getStepCoordinates(step));
}

/**
 * Like extractPolylineCoordinates but restricted to TRANSIT steps only.
 * Used as the fallback search path when GTFS stop data is unavailable.
 */
export function extractTransitPolyline(
  route: google.maps.DirectionsRoute,
): google.maps.LatLngLiteral[] {
  return route.legs
    .flatMap((leg) => leg.steps)
    .filter((step) => isTransitStep(step))
    .flatMap((step) => getStepCoordinates(step));
}

function getStepCoordinates(
  step: google.maps.DirectionsStep,
): google.maps.LatLngLiteral[] {
  if (step.path && step.path.length > 0) {
    return step.path.map((point) => normalizeLatLng(point));
  }

  const encoded = getEncodedPolyline(step.polyline);
  if (encoded) {
    return decode(encoded).map(([lat, lng]) => ({ lat, lng }));
  }

  return [];
}

export function normalizeLatLng(
  point: google.maps.LatLng | google.maps.LatLngLiteral,
): google.maps.LatLngLiteral {
  if (typeof (point as google.maps.LatLng).lat === "function") {
    const latLng = point as google.maps.LatLng;
    return { lat: latLng.lat(), lng: latLng.lng() };
  }
  return point as google.maps.LatLngLiteral;
}

function getEncodedPolyline(
  polyline: string | { points?: string } | undefined,
): string | undefined {
  if (!polyline) return undefined;
  if (typeof polyline === "string") return polyline;
  return polyline.points;
}

function pointsEqual(
  a: google.maps.LatLngLiteral,
  b: google.maps.LatLngLiteral,
  epsilon = 1e-6,
): boolean {
  return (
    Math.abs(a.lat - b.lat) < epsilon && Math.abs(a.lng - b.lng) < epsilon
  );
}

function appendUniquePoints(
  path: google.maps.LatLngLiteral[],
  points: google.maps.LatLngLiteral[],
) {
  for (const point of points) {
    const last = path[path.length - 1];
    if (last && pointsEqual(last, point)) continue;
    path.push(point);
  }
}

/** Full-resolution path for drawing — connects exactly to origin/destination. */
export function buildRoutePath(
  route: google.maps.DirectionsRoute,
): google.maps.LatLngLiteral[] {
  const path: google.maps.LatLngLiteral[] = [];

  for (const leg of route.legs) {
    if (leg.start_location) {
      appendUniquePoints(path, [normalizeLatLng(leg.start_location)]);
    }

    for (const step of leg.steps) {
      appendUniquePoints(path, getStepCoordinates(step));
    }

    if (leg.end_location) {
      appendUniquePoints(path, [normalizeLatLng(leg.end_location)]);
    }
  }

  return path;
}

export function getRouteBoundsPoints(
  route: google.maps.DirectionsRoute,
): google.maps.LatLngLiteral[] {
  const path = buildRoutePath(route);
  if (path.length > 0) return path;

  if (route.overview_path && route.overview_path.length > 0) {
    return route.overview_path.map((point) => normalizeLatLng(point));
  }

  const encoded = getEncodedPolyline(route.overview_polyline);
  if (encoded) {
    return decode(encoded).map(([lat, lng]) => ({ lat, lng }));
  }

  return [];
}

export function getRouteEndpoints(route: google.maps.DirectionsRoute): {
  origin: google.maps.LatLngLiteral | null;
  destination: google.maps.LatLngLiteral | null;
} {
  const firstLeg = route.legs[0];
  const lastLeg = route.legs[route.legs.length - 1];

  return {
    origin: firstLeg?.start_location
      ? normalizeLatLng(firstLeg.start_location)
      : null,
    destination: lastLeg?.end_location
      ? normalizeLatLng(lastLeg.end_location)
      : null,
  };
}

export type RouteSegment = {
  path: google.maps.LatLngLiteral[];
  /** Raw travel_mode string: "WALKING", "TRANSIT", etc. */
  travelMode: string;
  /** GTFS/Google vehicle type string, e.g. "BUS", "SUBWAY", "HEAVY_RAIL". */
  vehicleType?: string;
  lineName?: string;
  /** Lat/lng of the boarding stop for TRANSIT segments. */
  departureLocation?: google.maps.LatLngLiteral;
};

/**
 * Returns one RouteSegment per step so callers can render each leg
 * with a distinct style (walking vs transit, bus vs train).
 */
export function getRouteSegments(
  route: google.maps.DirectionsRoute,
): RouteSegment[] {
  return route.legs.flatMap((leg) =>
    leg.steps.map((step) => {
      const transit = getStepTransit(step);
      const depLoc = transit?.departure_stop?.location;
      const departureLocation = depLoc
        ? normalizeLatLng(depLoc as google.maps.LatLng)
        : undefined;
      return {
        path: getStepCoordinates(step),
        travelMode: (step.travel_mode as string) ?? "",
        vehicleType: transit?.line?.vehicle?.type as string | undefined,
        lineName:
          transit?.line?.short_name ?? transit?.line?.name ?? undefined,
        departureLocation,
      };
    }),
  );
}
