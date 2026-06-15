/**
 * Limits & guardrails for user actions.
 *
 * Route search  →  1 Directions API call, capped per day (Upstash)
 * Restaurant load  →  no separate limit; re-selecting a route uses cache
 */

/** Max route searches per user per day. */
export const DAILY_ROUTE_SEARCH_LIMIT = 10;

/** Minimum ms between route searches (prevents accidental double-submit). */
export const ROUTE_SEARCH_COOLDOWN_MS = 8_000;

/** Autocomplete debounce. */
export const AUTOCOMPLETE_DEBOUNCE_MS = 400;

/** Reject routes longer than this — keeps the app commute-focused. */
export const MAX_COMMUTE_MINUTES = 60;

/** Reject routes farther than this (straight-line trip distance from Google). */
export const MAX_ROUTE_DISTANCE_KM = 35;

export const SESSION_COOKIE_NAME = "rid_session";

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
