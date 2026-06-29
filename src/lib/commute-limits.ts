/** Reject routes longer than this — keeps the app commute-focused. */
export const MAX_COMMUTE_MINUTES = 90;

/** Reject routes farther than this (straight-line trip distance from Google). */
export const MAX_ROUTE_DISTANCE_KM = 45;

export function isRouteWithinCommuteLimits(
  route: google.maps.DirectionsRoute,
): boolean {
  const leg = route.legs[0];
  if (!leg) return false;

  const durationMinutes = (leg.duration?.value ?? Infinity) / 60;
  const distanceKm = (leg.distance?.value ?? Infinity) / 1000;

  return (
    durationMinutes <= MAX_COMMUTE_MINUTES &&
    distanceKm <= MAX_ROUTE_DISTANCE_KM
  );
}

export function formatCommuteLimitMessage(): string {
  return `Trips longer than ${MAX_COMMUTE_MINUTES} min or ${MAX_ROUTE_DISTANCE_KM} km aren't supported. Try a closer destination.`;
}
