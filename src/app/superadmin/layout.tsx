'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/superadmin', label: 'Platform Stats', icon: '🌍', id: '' },
  { href: '/superadmin/restaurants', label: 'Restaurants', icon: '🏪', id: 'restaurants' },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminName, setAdminName] = useState('Admin');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/auth/login'); return; }
    const stored = localStorage.getItem('owner');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.role !== 'SUPER_ADMIN') { router.replace('/dashboard'); return; }
      setAdminName(parsed.username);
    }
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') { setIsDark(false); document.documentElement.setAttribute('data-theme', 'light'); }
    else { setIsDark(true); document.documentElement.removeAttribute('data-theme'); }
  }, [router]);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  function toggleTheme() {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) { document.documentElement.removeAttribute('data-theme'); localStorage.setItem('theme', 'dark'); }
    else { document.documentElement.setAttribute('data-theme', 'light'); localStorage.setItem('theme', 'light'); }
  }

  function handleLogout() {
    localStorage.removeItem('token'); localStorage.removeItem('owner');
    document.cookie = 'token=; path=/; max-age=0';
    router.replace('/auth/login');
  }

  const active = pathname === '/superadmin' ? '' : pathname.split('/').pop() || '';

  return (
    <div className="dashboard-layout" style={{ '--accent': '#f43f5e', '--accent-glow': 'rgba(244,63,94,0.1)' } as React.CSSProperties}>
      {/* Mobile overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" style={{ color: 'var(--accent)' }}>👑</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar-logo-name">Super Admin</div>
            <div className="sidebar-logo-sub">QRBite SaaS</div>
          </div>
          <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">✕</button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <Link key={item.id} href={item.href} className={`sidebar-nav-item ${active === item.id ? 'active' : ''}`}>
              <span className="sidebar-nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-nav-item btn-ghost" onClick={handleLogout} style={{ width: '100%' }}>
            <span className="sidebar-nav-icon">🚪</span>Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <button id="hamburger-btn" className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
              <span /><span /><span />
            </button>
            <span className="topbar-title">{NAV_ITEMS.find(n => n.id === active)?.label || 'Super Admin'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="btn btn-ghost btn-icon" onClick={toggleTheme} aria-label="Toggle theme" title={isDark ? 'Light mode' : 'Dark mode'} style={{ fontSize: '1.1rem' }}>
              {isDark ? '☀️' : '🌙'}
            </button>
            <div style={{ width: 32, height: 32, background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, color: '#f43f5e' }}>
              {adminName[0]?.toUpperCase()}
            </div>
          </div>
        </header>
        <main className="dashboard-content animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
