'use client';

/**
 * Shared authentication header utility for client-side API calls.
 * Used by all dashboard pages to attach the JWT token to fetch requests.
 */
export function getAuthHeader(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const staffToken = typeof window !== 'undefined' ? localStorage.getItem('staffToken') : '';
  const authToken = token || staffToken || '';
  return { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };
}
