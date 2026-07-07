'use client';
import { useState, useEffect, FormEvent, Suspense } from 'react';
import Link from 'next/link';
import { Utensils, Eye, EyeOff, Users, Smartphone } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

const STAFF_ROLE_REDIRECT: Record<string, string> = {
  MANAGER: '/dashboard',
  WAITER: '/staff/waiter',
  CHEF: '/dashboard/kds',
  CASHIER: '/staff/cashier',
};

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab state: 'owner' | 'staff'
  const initialTab = searchParams.get('tab') === 'staff' ? 'staff' : 'owner';
  const [activeTab, setActiveTab] = useState<'owner' | 'staff'>(initialTab);

  // Owner form
  const [ownerForm, setOwnerForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  // Staff form
  const [staffForm, setStaffForm] = useState({ phone: '', pin: '' });
  const [showPin, setShowPin] = useState(false);

  // Shared states
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Check existing sessions on mount
  useEffect(() => {
    async function verifySession() {
      if (typeof window !== 'undefined') {
        // Check owner session
        const token = localStorage.getItem('token');
        const ownerStr = localStorage.getItem('owner');
        if (token && ownerStr) {
          try {
            const owner = JSON.parse(ownerStr);
            const res = await fetch('/api/auth/verify', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
              document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`;
              if (owner && owner.role === 'SUPER_ADMIN') {
                router.replace('/superadmin');
                return;
              } else if (owner) {
                router.replace('/dashboard');
                return;
              }
            } else {
              localStorage.removeItem('token');
              localStorage.removeItem('owner');
              document.cookie = 'token=; path=/; max-age=0; SameSite=Lax';
            }
          } catch {
            localStorage.removeItem('token');
            localStorage.removeItem('owner');
            document.cookie = 'token=; path=/; max-age=0; SameSite=Lax';
          }
        }

        // Check staff session
        const staffToken = localStorage.getItem('staffToken');
        const staffStr = localStorage.getItem('staff');
        if (staffToken && staffStr) {
          try {
            const staff = JSON.parse(staffStr);
            const redirect = STAFF_ROLE_REDIRECT[staff.role] || '/staff/waiter';
            router.replace(redirect);
            return;
          } catch {
            localStorage.removeItem('staffToken');
            localStorage.removeItem('staff');
          }
        }
      }
      setCheckingAuth(false);
    }
    verifySession();
  }, [router]);

  // Clear error when switching tabs
  useEffect(() => {
    setError('');
  }, [activeTab]);

  if (checkingAuth) {
    return (
      <div className="loading-center" style={{ minHeight: '100vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
        <span>Verifying session…</span>
      </div>
    );
  }

  // ─── Owner Login Handler ───
  async function handleOwnerSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ownerForm),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || 'Login failed');
        setLoading(false);
        return;
      }
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('owner', JSON.stringify(data.data.owner));
      document.cookie = `token=${data.data.token}; path=/; max-age=86400; SameSite=Lax`;

      setToast({ message: 'Logged in successfully!', type: 'success' });

      setTimeout(() => {
        if (data.data.owner.role === 'SUPER_ADMIN') {
          window.location.href = '/superadmin';
        } else {
          window.location.href = '/dashboard';
        }
      }, 1000);
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  // ─── Staff Login Handler ───
  async function handleStaffSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!staffForm.phone.trim() || !staffForm.pin) {
      setError('Phone number and PIN are required');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/staff/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: staffForm.phone.trim(),
          pin: staffForm.pin,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message || 'Login failed');
        setLoading(false);
        return;
      }

      // Store staff session
      localStorage.setItem('staffToken', data.data.token);
      localStorage.setItem('staff', JSON.stringify(data.data.staff));
      localStorage.setItem('staffRestaurant', JSON.stringify(data.data.restaurant));
      document.cookie = `staffToken=${data.data.token}; path=/; max-age=43200; SameSite=Lax`;

      setToast({ message: `Welcome, ${data.data.staff.name}!`, type: 'success' });

      const redirect = STAFF_ROLE_REDIRECT[data.data.staff.role] || '/staff/waiter';
      setTimeout(() => { window.location.href = redirect; }, 800);
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      {toast && (
        <>
          <style>{`
            @keyframes slideDown {
              from { opacity: 0; transform: translate(-50%, -20px); }
              to { opacity: 1; transform: translate(-50%, 0); }
            }
            .toast-top-center {
              position: fixed; top: 2rem; left: 50%;
              transform: translate(-50%, 0); z-index: 9999;
              animation: slideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .toast-top-center .toast { animation: none !important; }
          `}</style>
          <div className="toast-top-center">
            <div className="toast toast-success" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ color: 'var(--status-ready, #10b981)', display: 'flex', alignItems: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span>{toast.message}</span>
            </div>
          </div>
        </>
      )}

      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Utensils size={24} style={{ color: 'var(--accent)' }} />
          </div>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">
            {activeTab === 'owner'
              ? 'Sign in to your restaurant dashboard'
              : 'Sign in with your phone number & PIN'
            }
          </p>
        </div>

        {/* ─── Tab Switcher ─── */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-elevated, var(--bg-surface))',
          borderRadius: 'var(--radius-md)',
          padding: '4px',
          gap: '4px',
          marginBottom: '1.5rem',
          border: '1px solid var(--border)',
        }}>
          <button
            type="button"
            id="tab-owner"
            onClick={() => setActiveTab('owner')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              padding: '0.6rem 1rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              transition: 'all var(--transition)',
              background: activeTab === 'owner' ? 'var(--bg-base)' : 'transparent',
              color: activeTab === 'owner' ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: activeTab === 'owner' ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <Utensils size={14} />
            Restaurant
          </button>
          <button
            type="button"
            id="tab-staff"
            onClick={() => setActiveTab('staff')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              padding: '0.6rem 1rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              transition: 'all var(--transition)',
              background: activeTab === 'staff' ? 'var(--bg-base)' : 'transparent',
              color: activeTab === 'staff' ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: activeTab === 'staff' ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <Users size={14} />
            Staff
          </button>
        </div>

        {/* ─── Owner Login Form ─── */}
        {activeTab === 'owner' && (
          <form className="auth-form" onSubmit={handleOwnerSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                className="input-field"
                placeholder="your_username"
                value={ownerForm.username}
                onChange={e => setOwnerForm(p => ({ ...p, username: e.target.value }))}
                required
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  style={{ paddingRight: '3rem' }}
                  placeholder="••••••••"
                  value={ownerForm.password}
                  onChange={e => setOwnerForm(p => ({ ...p, password: e.target.value }))}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
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
                    justifyContent: 'center',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && <p className="form-error" style={{ textAlign: 'center' }}>{error}</p>}
            <button id="login-submit" type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Signing in…</> : 'Sign In →'}
            </button>
          </form>
        )}

        {/* ─── Staff Login Form ─── */}
        {activeTab === 'staff' && (
          <form className="auth-form" onSubmit={handleStaffSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="staff-phone">Phone Number</label>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                }}>
                  <Smartphone size={16} />
                </div>
                <input
                  id="staff-phone"
                  type="tel"
                  className="input-field"
                  style={{ paddingLeft: '2.75rem' }}
                  placeholder="Enter your mobile number"
                  value={staffForm.phone}
                  onChange={e => setStaffForm(p => ({ ...p, phone: e.target.value }))}
                  required
                  autoComplete="tel"
                />
              </div>
              <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Use the number your restaurant registered for you
              </small>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="staff-pin">PIN</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="staff-pin"
                  type={showPin ? 'text' : 'password'}
                  className="input-field"
                  style={{
                    paddingRight: '3rem',
                    fontFamily: 'monospace',
                    fontSize: '1.25rem',
                    letterSpacing: '0.25em',
                    textAlign: 'center',
                  }}
                  placeholder="• • • •"
                  value={staffForm.pin}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setStaffForm(p => ({ ...p, pin: val }));
                  }}
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="off"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
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
                    justifyContent: 'center',
                  }}
                  aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <p className="form-error" style={{ textAlign: 'center' }}>{error}</p>}

            <button id="staff-login-submit" type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Signing in…</> : 'Sign In →'}
            </button>
          </form>
        )}

        {/* ─── Bottom Link ─── */}
        {activeTab === 'owner' && (
          <>
            <div className="auth-divider" style={{ marginTop: '1.5rem' }}>
              <span>New here?</span>
            </div>
            <Link href="/auth/register" className="btn btn-ghost btn-full" style={{ marginTop: '0.75rem' }}>
              Register your restaurant
            </Link>
          </>
        )}

        {activeTab === 'staff' && (
          <p style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}>
            Don&apos;t have a PIN? Ask your restaurant manager to set up your staff account.
          </p>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="loading-center" style={{ minHeight: '100vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
        <span>Loading…</span>
      </div>
    }>
      <LoginPageInner />
    </Suspense>
  );
}
