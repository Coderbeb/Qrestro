'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Globe, Store, Crown, LogOut, Sun, Moon, Lock, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/superadmin', label: 'Platform Stats', icon: <Globe size={18} />, id: '' },
  { href: '/superadmin/restaurants', label: 'Restaurants', icon: <Store size={18} />, id: 'restaurants' },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminName, setAdminName] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('owner');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return parsed.username || 'Admin';
        } catch (e) {
          return 'Admin';
        }
      }
    }
    return 'Admin';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  useEffect(() => {
    const stored = localStorage.getItem('sidebarCollapsed');
    if (stored === 'true') {
      setSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

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
    if (!token) { router.replace('/auth/login'); return; }
    const stored = localStorage.getItem('owner');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.role !== 'SUPER_ADMIN') { router.replace('/dashboard'); return; }
    }
  }, [router]);

  // Close sidebar and profile dropdown on route change (mobile)
  useEffect(() => {
    setProfileMenuOpen(false);
    setSidebarOpen(false);
  }, [pathname]);

  function toggleTheme() {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) { document.documentElement.setAttribute('data-theme', 'dark'); localStorage.setItem('theme', 'dark'); }
    else { document.documentElement.removeAttribute('data-theme'); localStorage.setItem('theme', 'light'); }
  }

  function handleLogout() {
    localStorage.removeItem('token'); localStorage.removeItem('owner');
    document.cookie = 'token=; path=/; max-age=0';
    router.replace('/');
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

  const active = pathname === '/superadmin' ? '' : pathname.split('/').pop() || '';

  return (
    <div className="dashboard-layout">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" style={{ color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Crown size={20} /></div>
          <div className="sidebar-logo-text" style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar-logo-name">Super Admin</div>
            <div className="sidebar-logo-sub">QRestro SaaS</div>
          </div>
          {/* Collapse button for desktop */}
          <button 
            className="sidebar-collapse-btn-desktop" 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
          <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">✕</button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <Link key={item.id} href={item.href} className={`sidebar-nav-item ${active === item.id ? 'active' : ''}`}>
              <span className="sidebar-nav-icon">{item.icon}</span>
              <span className="sidebar-nav-text">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-nav-item btn-ghost" onClick={handleLogout} style={{ width: '100%' }}>
            <span className="sidebar-nav-icon"><LogOut size={16} /></span>
            <span className="sidebar-nav-text">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <button id="hamburger-btn" className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
              <span /><span /><span />
            </button>
            <span className="topbar-title">{NAV_ITEMS.find(n => n.id === active)?.label || 'Super Admin'}</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Theme Toggle */}
            <button className="btn btn-ghost btn-icon" onClick={toggleTheme} aria-label="Toggle theme" title={isDark ? 'Light mode' : 'Dark mode'} style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                aria-label="Admin Profile Menu"
                aria-expanded={profileMenuOpen}
              >
                {adminName[0]?.toUpperCase()}
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
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{adminName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Super Admin</div>
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

        <main className="dashboard-content animate-fade-in">{children}</main>
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
