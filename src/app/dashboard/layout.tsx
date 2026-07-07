'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, UtensilsCrossed, QrCode, ShoppingBag, Settings, LogOut, Sun, Moon, Lock, Eye, EyeOff, ChevronLeft, ChevronRight, CreditCard, TrendingUp, ChefHat, Users } from 'lucide-react';
import { useSocket } from '@/lib/useSocket';
import { playNotificationSound } from '@/lib/audio';

// Keep ChevronLeft/ChevronRight referenced so Turbopack includes their module factories
// (prevents stale-cache errors when HMR updates remove them from the template)
void ChevronLeft; void ChevronRight;

const NAV_SECTIONS = [
  {
    title: 'Operations',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, id: '' },
      { href: '/dashboard/orders', label: 'Orders', icon: <ShoppingBag size={18} />, id: 'orders' },
      { href: '/dashboard/billing', label: 'Billing', icon: <CreditCard size={18} />, id: 'billing' },
    ]
  },
  {
    title: 'Management',
    items: [
      { href: '/dashboard/menu', label: 'Menu', icon: <UtensilsCrossed size={18} />, id: 'menu' },
      { href: '/dashboard/tables', label: 'Tables & QR', icon: <QrCode size={18} />, id: 'tables' },
      { href: '/dashboard/staff', label: 'Staff', icon: <Users size={18} />, id: 'staff' },
    ]
  },
  {
    title: 'Analytics & Admin',
    items: [
      { href: '/dashboard/reports', label: 'Reports', icon: <TrendingUp size={18} />, id: 'reports' },
      { href: '/dashboard/settings', label: 'Settings', icon: <Settings size={18} />, id: 'settings' },
    ]
  }
];

const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap(section => section.items);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [owner, setOwner] = useState<{ id?: string; restaurantName?: string; username?: string; role?: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);


  const [isDark, setIsDark] = useState(false);

  // Dropdown & Modal states
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  
  // Password form states
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPwd, setSavingPwd] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Eye toggle states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const staffToken = localStorage.getItem('staffToken');
    if (!token && !staffToken) { router.replace('/auth/login'); return; }
    
    if (token) {
      const stored = localStorage.getItem('owner');
      if (stored) setOwner(JSON.parse(stored));
    } else if (staffToken) {
      const storedStaff = localStorage.getItem('staff');
      const storedRest = localStorage.getItem('staffRestaurant');
      if (storedStaff && storedRest) {
        const staff = JSON.parse(storedStaff);
        const rest = JSON.parse(storedRest);
        setOwner({
          id: staff.ownerId,
          restaurantName: rest.name,
          username: `${staff.name} (${staff.role})`,
          role: staff.role,
        });
      }
    }

    // Restore theme from localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDark(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      setIsDark(false);
      document.documentElement.removeAttribute('data-theme');
    }
  }, [router]);

  const socketListeners = useMemo(() => ({
    'order:new': () => {
      playNotificationSound();
    }
  }), []);

  useSocket(owner?.id || null, socketListeners);

  // Close sidebar and profile menu on route change (mobile)
  useEffect(() => {
    setProfileMenuOpen(false);
    setSidebarOpen(false);
  }, [pathname]);

  function toggleTheme() {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }

  function handleLogout() {
    const isStaff = !!localStorage.getItem('staffToken');
    localStorage.removeItem('token');
    localStorage.removeItem('owner');
    localStorage.removeItem('staffToken');
    localStorage.removeItem('staff');
    localStorage.removeItem('staffRestaurant');
    document.cookie = 'token=; path=/; max-age=0';
    document.cookie = 'staffToken=; path=/; max-age=0';
    router.replace(isStaff ? '/auth/login?tab=staff' : '/');
  }

  async function handlePasswordChangeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErrorMsg('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters');
      return;
    }
    setSavingPwd(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Password changed successfully!');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        // Hide password indicators
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        setTimeout(() => setChangePasswordModalOpen(false), 1500);
      } else {
        setErrorMsg(data.error?.message || 'Failed to change password');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setSavingPwd(false);
    }
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
          <div className="sidebar-logo-icon" style={{ color: '#fff' }}><UtensilsCrossed size={20} /></div>
          <div className="sidebar-logo-text">
            <div className="sidebar-logo-name">{owner?.restaurantName || 'QRestro'}</div>
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
          {NAV_SECTIONS.filter(section => {
            if (!owner?.role || owner.role === 'RESTAURANT_OWNER' || owner.role === 'MANAGER') return true;
            if (owner.role === 'WAITER' || owner.role === 'CASHIER') return section.title === 'Operations';
            return false;
          }).map(section => {
            const items = (owner?.role === 'WAITER' || owner?.role === 'CASHIER')
                ? section.items.filter(item => 
                    item.id === 'orders' || 
                    item.id === 'tables' || 
                    item.id === '' || 
                    (owner.role === 'CASHIER' && item.id === 'billing')
                  )
                : section.items;
              
            return (
            <div key={section.title} className="sidebar-section">
              <div className="sidebar-section-title">{section.title}</div>
              <div className="sidebar-section-items" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {items.map(item => (
                  <Link
                    key={item.id}
                    href={item.href}
                    id={`nav-${item.id || 'dashboard'}`}
                    className={`sidebar-nav-item ${active === item.id ? 'active' : ''}`}
                  >
                    <span className="sidebar-nav-icon">{item.icon}</span>
                    <span className="sidebar-nav-text">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          )})}
        </nav>

        <div className="sidebar-footer">
          <button 
            id="logout-btn" 
            className="sidebar-nav-item btn-ghost" 
            onClick={handleLogout} 
            style={{ 
              width: '100%', 
              color: 'var(--status-cancelled)' 
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(220, 38, 38, 0.08)';
              e.currentTarget.style.color = 'var(--status-cancelled)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--status-cancelled)';
            }}
          >
            <span className="sidebar-nav-icon" style={{ color: 'var(--status-cancelled)' }}><LogOut size={16} /></span>
            <span className="sidebar-nav-text">Logout</span>
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
              {ALL_NAV_ITEMS.find(n => n.id === active)?.label || 'Dashboard'}
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
              style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Profile Dropdown Trigger */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                style={{
                  width: 32, height: 32,
                  background: 'var(--accent-glow)',
                  border: '1px solid var(--accent)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  outline: 'none',
                  padding: 0,
                  transition: 'transform var(--transition)'
                }}
                aria-label="Owner Profile Menu"
                aria-expanded={profileMenuOpen}
              >
                {owner?.username?.[0]?.toUpperCase() || '?'}
              </button>

              {/* Profile Dropdown Menu */}
              {profileMenuOpen && (
                <>
                  <div 
                    onClick={() => setProfileMenuOpen(false)} 
                    style={{ position: 'fixed', inset: 0, zIndex: 998 }} 
                  />
                  
                  <div 
                    className="card animate-fade-in"
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 'calc(100% + 0.5rem)',
                      width: '220px',
                      padding: '0.75rem',
                      zIndex: 999,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      boxShadow: 'var(--shadow-lg)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)'
                    }}
                  >
                    <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{owner?.restaurantName || 'Restaurant Owner'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{owner?.username || 'owner'}</div>
                    </div>
                    
                    <button 
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setChangePasswordModalOpen(true);
                      }}
                      className="sidebar-nav-item"
                      style={{ 
                        padding: '0.6rem 0.75rem', 
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left'
                      }}
                    >
                      <Lock size={15} style={{ color: 'var(--accent)' }} />
                      Change Password
                    </button>
                    
                    <button 
                      onClick={() => {
                        setProfileMenuOpen(false);
                        handleLogout();
                      }}
                      className="sidebar-nav-item"
                      style={{ 
                        padding: '0.6rem 0.75rem', 
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--status-cancelled)',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left'
                      }}
                    >
                      <LogOut size={15} />
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="dashboard-content animate-fade-in">
          {children}
        </main>
      </div>

      {/* Change Password Modal Overlay */}
      {changePasswordModalOpen && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-box animate-fade-in" style={{ maxWidth: '420px', padding: '2rem' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 700, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={20} style={{ color: 'var(--accent)' }} /> Change Password
              </h3>
              <button 
                onClick={() => {
                  setChangePasswordModalOpen(false);
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handlePasswordChangeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Current Password */}
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    className="input-field"
                    style={{ paddingRight: '3rem' }}
                    value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={{
                      position: 'absolute',
                      right: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    className="input-field"
                    style={{ paddingRight: '3rem' }}
                    placeholder="Min 6 characters"
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute',
                      right: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="input-field"
                    style={{ paddingRight: '3rem' }}
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {errorMsg && <p className="form-error" style={{ textAlign: 'center', margin: 0 }}>{errorMsg}</p>}
              {successMsg && <p style={{ color: 'var(--status-ready)', fontSize: '0.8rem', textAlign: 'center', margin: 0 }}>{successMsg}</p>}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  style={{ flex: 1 }}
                  onClick={() => {
                    setChangePasswordModalOpen(false);
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  disabled={savingPwd}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  disabled={savingPwd}
                >
                  {savingPwd ? 'Updating…' : 'Update Password'}
                </button>
              </div>
              
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
