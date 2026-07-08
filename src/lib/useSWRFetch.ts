'use client';

import useSWR, { SWRConfiguration, mutate as globalMutate, preload } from 'swr';

/**
 * Authenticated fetcher for SWR.
 * Reads the JWT token from localStorage and attaches it as a Bearer token.
 */
export async function authFetcher<T>(url: string): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const staffToken = typeof window !== 'undefined' ? localStorage.getItem('staffToken') : '';
  const authToken = token || staffToken || '';

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const error = new Error(`Fetch failed for ${url}: ${res.status} ${res.statusText}`);
    throw error;
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || 'API error');
  }
  return json.data;
}

/**
 * Shared SWR hook for authenticated dashboard API calls.
 *
 * Features:
 * - Shows cached data instantly on re-mount (0ms tab switching)
 * - Revalidates silently in background
 * - Deduplicates parallel requests to the same endpoint
 *
 * @param key - API endpoint (e.g. '/api/orders?limit=100') or null to skip
 * @param config - Optional SWR configuration overrides
 */
export function useSWRFetch<T = unknown>(
  key: string | null,
  config?: SWRConfiguration
) {
  return useSWR<T>(key, authFetcher, {
    revalidateOnFocus: false,    // Don't refetch when window regains focus
    dedupingInterval: 5000,      // Dedupe requests within 5 seconds (was 2s)
    keepPreviousData: true,      // Show stale data while revalidating
    revalidateIfStale: true,     // Background revalidate stale data
    ...config,
  });
}

// ─── Global Socket Connection State ────────────────────────────
// Updated by useSocket hook; read by useAdaptiveInterval

let _socketConnected = false;

/** Called by useSocket when connection state changes */
export function setSocketConnected(connected: boolean): void {
  _socketConnected = connected;
}

/** Check if socket is currently connected */
export function isSocketConnected(): boolean {
  return _socketConnected;
}

// ─── Adaptive Polling ──────────────────────────────────────────

/**
 * Returns a refreshInterval value that adapts to socket connection state:
 * - Socket connected → 0 (no polling, real-time handles it)
 * - Socket disconnected → fallback interval
 *
 * @param fallbackMs - Polling interval when socket is disconnected (default: 5000)
 */
export function getAdaptiveInterval(fallbackMs: number = 5000): number {
  return _socketConnected ? 0 : fallbackMs;
}

// ─── Cache Mutation Utilities ──────────────────────────────────

/**
 * Globally mutate (invalidate) a specific SWR cache key.
 * Use this from Socket.io handlers to refresh data in real-time.
 *
 * @param key - The API endpoint to invalidate (e.g. '/api/orders?limit=100')
 */
export function invalidateCache(key: string) {
  globalMutate(key);
}

/**
 * Globally mutate multiple SWR cache keys at once.
 */
export function invalidateCaches(...keys: string[]) {
  for (const key of keys) {
    globalMutate(key);
  }
}

/**
 * Optimistically update SWR cache without triggering a re-fetch.
 * The data is updated immediately in the UI, then SWR revalidates
 * in the background to ensure consistency.
 *
 * @param key - The SWR cache key
 * @param updater - Function that receives current data and returns new data
 *
 * @example
 * ```ts
 * // When a new order arrives via socket:
 * optimisticUpdate<Order[]>('/api/orders?limit=100', prev =>
 *   [newOrder, ...(prev || []).filter(o => o.id !== newOrder.id)]
 * );
 * ```
 */
export function optimisticUpdate<T>(
  key: string,
  updater: (current: T | undefined) => T,
) {
  globalMutate(key, (current: T | undefined) => updater(current), {
    revalidate: true,  // Still revalidate in background for consistency
  });
}

/**
 * ALL dashboard API endpoints that should be prefetched.
 * Called once in the layout to warm the SWR cache for every tab.
 */
const DASHBOARD_ENDPOINTS = [
  '/api/stats',
  '/api/orders?limit=8',
  '/api/orders?limit=100',
  '/api/billing',
  '/api/menu',
  '/api/categories',
  '/api/tables',
  '/api/staff',
  '/api/auth/profile',
  '/api/reports?preset=today',
];

/**
 * Prefetch ALL dashboard data in parallel.
 * Call this once from the dashboard layout on mount.
 * By the time the user clicks any tab, data is already in SWR cache.
 */
export function prefetchAllDashboardData() {
  for (const endpoint of DASHBOARD_ENDPOINTS) {
    preload(endpoint, authFetcher);
  }
}
