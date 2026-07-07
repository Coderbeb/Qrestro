'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy staff login page — now redirects to the unified login at /auth/login?tab=staff.
 * This page exists only as a fallback for old bookmarks or cached URLs.
 */
export default function StaffLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Preserve any existing staff session (the unified login page handles this)
    router.replace('/auth/login?tab=staff');
  }, [router]);

  return (
    <div className="loading-center" style={{ minHeight: '100vh' }}>
      <div className="spinner" style={{ width: 40, height: 40 }} />
      <span>Redirecting to login…</span>
    </div>
  );
}
