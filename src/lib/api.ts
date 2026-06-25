'use client';

/**
 * Shared authentication header utility for client-side API calls.
 * Used by all dashboard pages to attach the JWT token to fetch requests.
 */
export function getAuthHeader(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}
