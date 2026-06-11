/**
 * Rate limits count **user actions**, not individual Google API calls.
 *
 * One route search  →  1 Directions API call
 * One route selection (first time)  →  ~8–18 Nearby Search calls (batched)
 * Re-selecting a cached route  →  0 API calls
 * Autocomplete keystrokes  →  client-debounced only, not counted here
 */

/** Max route searches per user per day. */
export const DAILY_ROUTE_SEARCH_LIMIT = 10;

/** Max restaurant fetches per user per day. */
export const DAILY_RESTAURANT_FETCH_LIMIT = 50;

/** Minimum ms between route searches (prevents accidental double-submit). */
export const ROUTE_SEARCH_COOLDOWN_MS = 8_000;

/** Autocomplete debounce. */
export const AUTOCOMPLETE_DEBOUNCE_MS = 400;

export const SESSION_COOKIE_NAME = "rid_session";

export type RateLimitAction = "route_search" | "restaurant_fetch";

export function getDailyLimit(action: RateLimitAction): number {
  return action === "route_search"
    ? DAILY_ROUTE_SEARCH_LIMIT
    : DAILY_RESTAURANT_FETCH_LIMIT;
}
