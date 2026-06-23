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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/auth/login'); return; }
    const stored = localStorage.getItem('owner');
    // eslint-disable-next-line
    if (stored) setOwner(JSON.parse(stored));

    // Restore theme from localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDark(false);
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      setIsDark(true);
      document.documentElement.removeAttribute('data-theme');
    }
  }, [router]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  function toggleTheme() {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  }

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
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🍴</div>
          <div>
            <div className="sidebar-logo-name">{owner?.restaurantName || 'QRBite'}</div>
            <div className="sidebar-logo-sub">@{owner?.username || '...'}</div>
          </div>
          {/* Close button for mobile */}
          <button
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            ✕
          </button>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {/* Hamburger menu button — mobile only */}
            <button
              id="hamburger-btn"
              className="hamburger-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <span />
              <span />
              <span />
            </button>
            <span className="topbar-title">
              {NAV_ITEMS.find(n => n.id === active)?.label || 'Dashboard'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Dark / Light mode toggle */}
            <button
              id="theme-toggle-btn"
              className="btn btn-ghost btn-icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{ fontSize: '1.1rem' }}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
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
