import Redis from "ioredis";
import { env } from "./env";

/**
 * Redis client — PRD §6 (Performance & Scalability)
 *
 * Lazy singleton: the client is created once and reused.
 * Disconnected-safe: if Redis is unavailable, withCache() falls through
 * to the live database query without throwing.
 */

let _client: Redis | null = null;

function getClient(): Redis {
  if (!_client) {
    _client = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });

    _client.on("error", (err) => {
      // Log but never crash the process — Redis is a performance layer, not a hard dependency
      console.error("[Redis] Connection error:", err.message);
    });
  }
  return _client;
}

export const redis = getClient();

/**
 * Cache-aside helper with automatic JSON (de)serialization.
 *
 * @param key      Cache key
 * @param ttlSecs  Time-to-live in seconds (default: 900 = 15 minutes per PRD)
 * @param fetchFn  Async function that fetches the real data when cache misses
 */
export async function withCache<T>(
  key: string,
  ttlSecs: number = 900,
  fetchFn: () => Promise<T>
): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (err) {
    // Redis unavailable — fall through to live DB query
    console.warn("[Redis] Cache read miss (falling through to DB):", (err as Error).message);
  }

  const result = await fetchFn();

  try {
    await redis.setex(key, ttlSecs, JSON.stringify(result));
  } catch (err) {
    // Write failure is non-fatal
    console.warn("[Redis] Cache write failed:", (err as Error).message);
  }

  return result;
}

/**
 * Invalidate one or more cache keys (call after mutations that affect cached data)
 */
export async function invalidateCache(...keys: string[]): Promise<void> {
  try {
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.warn("[Redis] Cache invalidation failed:", (err as Error).message);
  }
}

// Cache key constants — centralised to avoid typos
export const CACHE_KEYS = {
  AR_AGING: "dashboard:ar-aging",
  TOP_ENTITIES: "dashboard:top-entities",
  FINANCIAL_SUMMARY_TODAY: "dashboard:financial-summary:today",
  FINANCIAL_SUMMARY_MONTH: "dashboard:financial-summary:month",
  FINANCIAL_SUMMARY_YEAR: "dashboard:financial-summary:year",
  SHOWROOM_ANALYTICS: (customerId: string) => `dashboard:showroom-analytics:${customerId}`,
} as const;
