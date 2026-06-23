'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊', id: '' },
  { href: '/dashboard/menu', label: 'Menu', icon: '🍽️', id: 'menu' },
  { href: '/dashboard/tables', label: 'Tables & QR', icon: '📱', id: 'tables' },
  { href: '/dashboard/orders', label: 'Orders', icon: '🛒', id: 'orders' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙️', id: 'settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [owner, setOwner] = useState<{ restaurantName?: string; username?: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/auth/login'); return; }
    const stored = localStorage.getItem('owner');
    // eslint-disable-next-line
    if (stored) setOwner(JSON.parse(stored));
  }, [router]);

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('owner');
    document.cookie = 'token=; path=/; max-age=0';
    router.replace('/auth/login');
  }

  // Active segment: /dashboard → '', /dashboard/menu → 'menu'
  const active = pathname === '/dashboard' ? '' : pathname.split('/').pop() || '';

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🍴</div>
          <div>
            <div className="sidebar-logo-name">{owner?.restaurantName || 'QRBite'}</div>
            <div className="sidebar-logo-sub">@{owner?.username || '...'}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.id}
              href={item.href}
              id={`nav-${item.id || 'dashboard'}`}
              className={`sidebar-nav-item ${active === item.id ? 'active' : ''}`}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button id="logout-btn" className="sidebar-nav-item btn-ghost" onClick={handleLogout} style={{ width: '100%' }}>
            <span className="sidebar-nav-icon">🚪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <span className="topbar-title">
            {NAV_ITEMS.find(n => n.id === active)?.label || 'Dashboard'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 32, height: 32,
              background: 'var(--accent-glow)',
              border: '1px solid rgba(124,109,250,0.3)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent)',
            }}>
              {owner?.username?.[0]?.toUpperCase() || '?'}
            </div>
          </div>
        </header>
        <main className="dashboard-content animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
