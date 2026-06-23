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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/auth/login'); return; }
    const stored = localStorage.getItem('owner');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.role !== 'SUPER_ADMIN') {
        router.replace('/dashboard');
        return;
      }
      // eslint-disable-next-line
      setAdminName(parsed.username);
    }
  }, [router]);

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('owner');
    document.cookie = 'token=; path=/; max-age=0';
    router.replace('/auth/login');
  }

  const active = pathname === '/superadmin' ? '' : pathname.split('/').pop() || '';

  return (
    <div className="dashboard-layout" style={{ '--accent': '#f43f5e', '--accent-glow': 'rgba(244,63,94,0.1)' } as React.CSSProperties}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" style={{ color: 'var(--accent)' }}>👑</div>
          <div>
            <div className="sidebar-logo-name">Super Admin</div>
            <div className="sidebar-logo-sub">QRBite SaaS Platform</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.id}
              href={item.href}
              className={`sidebar-nav-item ${active === item.id ? 'active' : ''}`}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-nav-item btn-ghost" onClick={handleLogout} style={{ width: '100%' }}>
            <span className="sidebar-nav-icon">🚪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <span className="topbar-title">
            {NAV_ITEMS.find(n => n.id === active)?.label || 'Super Admin'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 32, height: 32,
              background: 'var(--accent-glow)',
              border: '1px solid rgba(244,63,94,0.3)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent)',
            }}>
              {adminName[0]?.toUpperCase()}
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
