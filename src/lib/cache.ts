/**
 * In-memory TTL cache for API route responses.
 *
 * On Vercel, serverless functions stay warm for ~5-15 minutes.
 * During that window every cache HIT returns in <1ms instead of
 * making a 200-400ms database round-trip.
 *
 * Uses `globalThis` so the store survives across requests within
 * the same function invocation (same as the Prisma singleton pattern
 * already used in db.ts).
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

type CacheStore = Map<string, CacheEntry<unknown>>;

const globalForCache = globalThis as unknown as { __apiCache?: CacheStore; __cacheCleanup?: ReturnType<typeof setInterval> };

/** Shared cache store — survives across warm requests */
const store: CacheStore = globalForCache.__apiCache ?? new Map();
globalForCache.__apiCache = store;

// Cleanup expired entries every 60 seconds to prevent memory leaks
if (!globalForCache.__cacheCleanup) {
  globalForCache.__cacheCleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.expiresAt) store.delete(key);
    }
  }, 60_000);
}

/**
 * Get a value from cache, or compute and store it on miss.
 *
 * @param key   - Unique cache key (e.g. `"stats:owner-uuid"`)
 * @param ttl   - Time-to-live in **seconds**
 * @param fetcher - Async function that produces the value on cache miss
 * @returns The cached or freshly-fetched value
 *
 * @example
 * ```ts
 * const stats = await getCached(`stats:${ownerId}`, 10, async () => {
 *   return prisma.order.count({ where: { ownerId } });
 * });
 * ```
 */
export async function getCached<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const existing = store.get(key);
  if (existing && Date.now() < existing.expiresAt) {
    return existing.data as T;
  }

  const data = await fetcher();
  store.set(key, { data, expiresAt: Date.now() + ttl * 1000 });
  return data;
}

/**
 * Immediately invalidate one or more cache keys.
 * Call this from write endpoints (POST / PUT / DELETE) to ensure
 * the next GET returns fresh data.
 *
 * Supports exact keys and prefix matching:
 * - `invalidateCache('stats:abc-123')` — delete one key
 * - `invalidateCache('reports:abc-123')` — prefix match, deletes all `reports:abc-123*` keys
 */
export function invalidateServerCache(...keys: string[]): void {
  for (const key of keys) {
    // Exact match first
    if (store.has(key)) {
      store.delete(key);
    }
    // Prefix match: delete all keys that START with this key
    for (const storeKey of store.keys()) {
      if (storeKey.startsWith(key)) {
        store.delete(storeKey);
      }
    }
  }
}

/**
 * Clear ALL cache entries for a specific owner.
 * Useful when a major mutation affects multiple entities.
 */
export function invalidateOwnerCache(ownerId: string): void {
  for (const key of store.keys()) {
    if (key.includes(ownerId)) {
      store.delete(key);
    }
  }
}
