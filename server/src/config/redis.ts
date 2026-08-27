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
  AR_AGING: (tenantId: string) => `dashboard:${tenantId}:ar-aging`,
  TOP_ENTITIES: (tenantId: string) => `dashboard:${tenantId}:top-entities`,
  FINANCIAL_SUMMARY_TODAY: (tenantId: string) => `dashboard:${tenantId}:financial-summary:today`,
  FINANCIAL_SUMMARY_MONTH: (tenantId: string) => `dashboard:${tenantId}:financial-summary:month`,
  FINANCIAL_SUMMARY_YEAR: (tenantId: string) => `dashboard:${tenantId}:financial-summary:year`,
  SHOWROOM_ANALYTICS: (tenantId: string, customerId: string) => `dashboard:${tenantId}:showroom-analytics:${customerId}`,
  OVERVIEW: (tenantId: string, role: string) => `dashboard:${tenantId}:overview:${role}`,
} as const;

/**
 * Roles whose /dashboard/overview payload is cached. DRIVER is intentionally
 * excluded — its data is per-user, so caching it would explode key cardinality
 * (one key per driver) for little benefit; DRIVER is computed live instead.
 */
const CACHED_OVERVIEW_ROLES = ["ADMIN", "ACCOUNTANT", "SALES", "WAREHOUSE"] as const;

/**
 * Every dashboard cache key for a tenant — the granular §8 aggregates plus the
 * consolidated per-role overview keys. Bounded to a fixed set (Redis `del` has
 * no wildcard), so a bust is O(1) in key count.
 */
export function dashboardCacheKeys(tenantId: string): string[] {
  return [
    CACHE_KEYS.AR_AGING(tenantId),
    CACHE_KEYS.TOP_ENTITIES(tenantId),
    CACHE_KEYS.FINANCIAL_SUMMARY_TODAY(tenantId),
    CACHE_KEYS.FINANCIAL_SUMMARY_MONTH(tenantId),
    CACHE_KEYS.FINANCIAL_SUMMARY_YEAR(tenantId),
    ...CACHED_OVERVIEW_ROLES.map((role) => CACHE_KEYS.OVERVIEW(tenantId, role)),
  ];
}

/**
 * Bust all dashboard caches for a tenant. Call after any mutation that changes
 * the numbers a dashboard tile shows (payments, orders, stock, deliveries).
 * Non-fatal if Redis is down (invalidateCache swallows the error).
 */
export async function invalidateDashboardCache(tenantId: string): Promise<void> {
  await invalidateCache(...dashboardCacheKeys(tenantId));
}
