'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, Utensils, UserCheck, CreditCard, ChefHat, Shield } from 'lucide-react';

type StaffInfo = { id: string; name: string; role: string; assignedTables: number[] };
type RestaurantInfo = { id: string; name: string; code: string };

const ROLE_ICONS: Record<string, React.ReactNode> = {
  MANAGER: <Shield size={14} />,
  WAITER: <UserCheck size={14} />,
  CHEF: <ChefHat size={14} />,
  CASHIER: <CreditCard size={14} />,
};

const ROLE_LABELS: Record<string, string> = {
  MANAGER: 'Manager',
  WAITER: 'Waiter',
  CHEF: 'Chef',
  CASHIER: 'Cashier',
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [staff, setStaff] = useState<StaffInfo | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [checking, setChecking] = useState(true);

  // Skip layout for login pages (both old and unified)
  const isLoginPage = pathname === '/staff/login' || pathname === '/auth/login';

  useEffect(() => {
    if (isLoginPage) {
      setChecking(false);
      return;
    }

    const token = localStorage.getItem('staffToken');
    const staffStr = localStorage.getItem('staff');
    const restStr = localStorage.getItem('staffRestaurant');

    if (!token || !staffStr) {
      router.replace('/auth/login?tab=staff');
      return;
    }

    try {
      setStaff(JSON.parse(staffStr));
      if (restStr) setRestaurant(JSON.parse(restStr));
    } catch {
      router.replace('/auth/login?tab=staff');
      return;
    }

    setChecking(false);
  }, [isLoginPage, router]);

  function handleLogout() {
    localStorage.removeItem('staffToken');
    localStorage.removeItem('staff');
    localStorage.removeItem('staffRestaurant');
    document.cookie = 'staffToken=; path=/; max-age=0; SameSite=Lax';
    router.replace('/auth/login?tab=staff');
  }

  // Login page — render without layout chrome
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Auth check in progress
  if (checking) {
    return (
      <div className="loading-center" style={{ minHeight: '100vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
        <span>Checking session…</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* ─── Top Header Bar ─── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--bg-topbar)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        padding: '0.65rem 1rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent)', flexShrink: 0,
          }}>
            <Utensils size={18} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {restaurant?.name || 'QRestro'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {staff?.name}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                fontSize: '0.62rem', fontWeight: 600,
                padding: '0.1rem 0.4rem', borderRadius: '999px',
                background: 'var(--accent-glow)', color: 'var(--accent)',
              }}>
                {ROLE_ICONS[staff?.role || '']} {ROLE_LABELS[staff?.role || ''] || staff?.role}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)', background: 'var(--bg-surface)',
            color: 'var(--status-cancelled)', cursor: 'pointer',
            fontSize: '0.78rem', fontWeight: 600,
            transition: 'all var(--transition)', flexShrink: 0,
          }}
        >
          <LogOut size={14} />
          <span className="hide-mobile">Logout</span>
        </button>
      </header>

      {/* ─── Page Content ─── */}
      <main style={{ padding: '1rem', maxWidth: 800, margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}
