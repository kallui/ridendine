import { Redis } from "@upstash/redis";
import { QUOTA_LIMIT, QUOTA_WINDOW_MS } from "./config";
import type { QuotaResult } from "./types";

export type { QuotaResult };
export type ConsumeResult = QuotaResult & { allowed: boolean };

// ─── In-memory (dev / single-process) ────────────────────────────────────────

/** key → sorted array of request timestamps (ms) within the current window */
const memStore = new Map<string, number[]>();

function trimToWindow(ts: number[], now: number): number[] {
  const cutoff = now - QUOTA_WINDOW_MS;
  return ts.filter((t) => t > cutoff);
}

function buildResult(ts: number[]): QuotaResult {
  const oldest = ts[0] ?? null;
  return {
    limit: QUOTA_LIMIT,
    remaining: Math.max(0, QUOTA_LIMIT - ts.length),
    nextIncreaseAt: oldest !== null ? oldest + QUOTA_WINDOW_MS : null,
  };
}

function memCheck(key: string, now = Date.now()): QuotaResult {
  const ts = trimToWindow(memStore.get(key) ?? [], now);
  memStore.set(key, ts);
  return buildResult(ts);
}

function memConsume(key: string, now = Date.now()): ConsumeResult {
  const ts = trimToWindow(memStore.get(key) ?? [], now);
  if (ts.length >= QUOTA_LIMIT) {
    memStore.set(key, ts);
    return { allowed: false, ...buildResult(ts) };
  }
  const next = [...ts, now];
  memStore.set(key, next);
  return { allowed: true, ...buildResult(next) };
}

/** Clears in-memory store — for tests only. */
export function resetMemoryQuota(): void {
  memStore.clear();
}

// ─── Redis (production) ───────────────────────────────────────────────────────

let _redis: Redis | null = null;
const REDIS_PREFIX = "ridendine:quota:";

function getRedis(): Redis {
  if (!_redis) _redis = Redis.fromEnv();
  return _redis;
}

function redisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

/**
 * Each request is stored as a sorted-set member with score = timestamp (ms).
 * Member format: "${timestamp}:${random}" — unique per request, timestamp-parseable.
 * ZRANGE key 0 0 returns the oldest member → we parse its timestamp for nextIncreaseAt.
 */
async function redisCheck(key: string): Promise<QuotaResult> {
  const now = Date.now();
  const rkey = REDIS_PREFIX + key;
  const redis = getRedis();

  await redis.zremrangebyscore(rkey, 0, now - QUOTA_WINDOW_MS);
  const count = await redis.zcard(rkey);
  const [oldest] = await redis.zrange(rkey, 0, 0);

  const oldestMs = oldest ? parseInt((oldest as string).split(":")[0]!, 10) : null;
  return {
    limit: QUOTA_LIMIT,
    remaining: Math.max(0, QUOTA_LIMIT - count),
    nextIncreaseAt: oldestMs !== null ? oldestMs + QUOTA_WINDOW_MS : null,
  };
}

async function redisConsume(key: string): Promise<ConsumeResult> {
  const now = Date.now();
  const rkey = REDIS_PREFIX + key;
  const redis = getRedis();

  await redis.zremrangebyscore(rkey, 0, now - QUOTA_WINDOW_MS);
  const count = await redis.zcard(rkey);

  if (count >= QUOTA_LIMIT) {
    const [oldest] = await redis.zrange(rkey, 0, 0);
    const oldestMs = oldest ? parseInt((oldest as string).split(":")[0]!, 10) : null;
    return {
      allowed: false,
      limit: QUOTA_LIMIT,
      remaining: 0,
      nextIncreaseAt: oldestMs !== null ? oldestMs + QUOTA_WINDOW_MS : null,
    };
  }

  const member = `${now}:${Math.random().toString(36).slice(2, 8)}`;
  await redis.zadd(rkey, { score: now, member });
  await redis.pexpire(rkey, QUOTA_WINDOW_MS);

  const [oldest] = await redis.zrange(rkey, 0, 0);
  const oldestMs = oldest ? parseInt((oldest as string).split(":")[0]!, 10) : now;

  return {
    allowed: true,
    limit: QUOTA_LIMIT,
    remaining: Math.max(0, QUOTA_LIMIT - count - 1),
    nextIncreaseAt: oldestMs + QUOTA_WINDOW_MS,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Read current quota without consuming a slot. */
export async function checkQuota(identifier: string): Promise<QuotaResult> {
  if (process.env.DISABLE_RATE_LIMIT === "true") {
    return { limit: QUOTA_LIMIT, remaining: QUOTA_LIMIT, nextIncreaseAt: null };
  }
  if (redisConfigured()) return redisCheck(identifier);
  return memCheck(identifier);
}

/** Consume one slot. Returns allowed=false (and does NOT consume) if at limit. */
export async function consumeQuota(identifier: string): Promise<ConsumeResult> {
  if (process.env.DISABLE_RATE_LIMIT === "true") {
    return { allowed: true, limit: QUOTA_LIMIT, remaining: QUOTA_LIMIT, nextIncreaseAt: null };
  }
  if (redisConfigured()) return redisConsume(identifier);
  return memConsume(identifier);
}

export function quotaExceededResponse(quota: QuotaResult): Response {
  const waitMs = quota.nextIncreaseAt
    ? Math.max(1000, quota.nextIncreaseAt - Date.now())
    : QUOTA_WINDOW_MS;
  const retryAfterSec = Math.ceil(waitMs / 1000);

  return Response.json(
    {
      error: "rate_limit_exceeded",
      message: `Daily limit reached (${QUOTA_LIMIT}/${QUOTA_LIMIT} searches). Try again later.`,
      retryAfter: retryAfterSec,
      quota,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
}
