import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  DAILY_RESTAURANT_FETCH_LIMIT,
  DAILY_ROUTE_SEARCH_LIMIT,
  getDailyLimit,
  type RateLimitAction,
} from "@/lib/rate-limit-config";

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

// ─── In-memory fallback (dev / single-process) ───────────────────────────────

type MemoryEntry = { count: number; resetAt: number };
const memoryBuckets = new Map<string, MemoryEntry>();

function checkMemoryLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = memoryBuckets.get(key);

  if (!entry || entry.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, limit, remaining: limit - 1, reset: now + windowMs };
  }

  if (entry.count >= limit) {
    return { success: false, limit, remaining: 0, reset: entry.resetAt };
  }

  entry.count += 1;
  return { success: true, limit, remaining: limit - entry.count, reset: entry.resetAt };
}

// ─── Upstash (production multi-instance) ─────────────────────────────────────

let routeDayLimiter: Ratelimit | null = null;
let restaurantDayLimiter: Ratelimit | null = null;

function upstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function getRouteDayLimiter() {
  if (!routeDayLimiter) {
    routeDayLimiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(DAILY_ROUTE_SEARCH_LIMIT, "1 d"),
      prefix: "ridendine:route",
    });
  }
  return routeDayLimiter;
}

function getRestaurantDayLimiter() {
  if (!restaurantDayLimiter) {
    restaurantDayLimiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(DAILY_RESTAURANT_FETCH_LIMIT, "1 d"),
      prefix: "ridendine:restaurant",
    });
  }
  return restaurantDayLimiter;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** One user route search → one Directions API call. */
export async function checkRouteSearchLimit(
  identifier: string,
): Promise<RateLimitResult> {
  if (upstashConfigured()) {
    const r = await getRouteDayLimiter().limit(identifier);
    return { success: r.success, limit: r.limit, remaining: r.remaining, reset: r.reset };
  }
  return checkMemoryLimit(
    `${identifier}:route:day`,
    DAILY_ROUTE_SEARCH_LIMIT,
    24 * 60 * 60 * 1000,
  );
}

/**
 * One route selection (first time) → batch of Nearby Search calls.
 * Cache hits skip this entirely.
 */
export async function checkRestaurantFetchLimit(
  identifier: string,
): Promise<RateLimitResult> {
  if (upstashConfigured()) {
    const r = await getRestaurantDayLimiter().limit(identifier);
    return { success: r.success, limit: r.limit, remaining: r.remaining, reset: r.reset };
  }
  return checkMemoryLimit(
    `${identifier}:restaurant:day`,
    DAILY_RESTAURANT_FETCH_LIMIT,
    24 * 60 * 60 * 1000,
  );
}

export function rateLimitResponse(
  result: RateLimitResult,
  action: RateLimitAction,
) {
  const retryAfterSec = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  const limit = getDailyLimit(action);

  return Response.json(
    {
      error: "rate_limit_exceeded",
      action,
      limit,
      message: `Daily limit reached (${limit}/${limit} searches today). Resets tomorrow.`,
      retryAfter: retryAfterSec,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
}
