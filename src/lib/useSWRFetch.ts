'use client';

import useSWR, { SWRConfiguration, mutate as globalMutate } from 'swr';

/**
 * Authenticated fetcher for SWR.
 * Reads the JWT token from localStorage and attaches it as a Bearer token.
 */
async function authFetcher<T>(url: string): Promise<T> {
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
    const error = new Error('Fetch failed');
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
    dedupingInterval: 2000,      // Dedupe requests within 2 seconds
    keepPreviousData: true,      // Show stale data while revalidating
    ...config,
  });
}

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
