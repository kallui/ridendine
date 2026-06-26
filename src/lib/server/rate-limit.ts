import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { DAILY_ROUTE_SEARCH_LIMIT, ROUTE_SEARCH_WINDOW_MS } from "@/lib/rate-limit-config";

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
      limiter: Ratelimit.slidingWindow(
        DAILY_ROUTE_SEARCH_LIMIT,
        `${ROUTE_SEARCH_WINDOW_MS} ms`,
      ),
      prefix: "ridendine:route",
    });
  }
  return routeDayLimiter;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** One user route search → one Directions API call. */
export async function checkRouteSearchLimit(
  identifier: string,
): Promise<RateLimitResult> {
  // Set DISABLE_RATE_LIMIT=true in .env.local to bypass all limits during development.
  if (process.env.DISABLE_RATE_LIMIT === "true") {
    return { success: true, limit: 999, remaining: 999, reset: Date.now() + ROUTE_SEARCH_WINDOW_MS };
  }

  if (upstashConfigured()) {
    const r = await getRouteDayLimiter().limit(identifier);
    return { success: r.success, limit: r.limit, remaining: r.remaining, reset: r.reset };
  }
  return checkMemoryLimit(
    `${identifier}:route:day`,
    DAILY_ROUTE_SEARCH_LIMIT,
    ROUTE_SEARCH_WINDOW_MS,
  );
}

/** Clears in-memory buckets — for tests only. */
export function resetMemoryRateLimits() {
  memoryBuckets.clear();
}

export function rateLimitResponse(result: RateLimitResult) {
  const retryAfterSec = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));

  return Response.json(
    {
      error: "rate_limit_exceeded",
      action: "route_search",
      limit: DAILY_ROUTE_SEARCH_LIMIT,
      message: `Daily limit reached (${DAILY_ROUTE_SEARCH_LIMIT}/${DAILY_ROUTE_SEARCH_LIMIT} searches). Try again when the timer resets.`,
      retryAfter: retryAfterSec,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
}
