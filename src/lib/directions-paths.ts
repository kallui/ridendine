import { decode } from "@googlemaps/polyline-codec";

export function extractPolylineCoordinates(
  route: google.maps.DirectionsRoute,
): google.maps.LatLngLiteral[] {
  return route.legs
    .flatMap((leg) => leg.steps)
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

function normalizeLatLng(
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
