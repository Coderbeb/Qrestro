'use client';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error?.message || 'Login failed'); return; }
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('owner', JSON.stringify(data.data.owner));
      // Set cookie for middleware access on page refresh
      document.cookie = `token=${data.data.token}; path=/; max-age=86400; SameSite=Lax`;
      if (data.data.owner.role === 'SUPER_ADMIN') {
        router.push('/superadmin');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🍴</div>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to your restaurant dashboard</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              className="input-field"
              placeholder="your_username"
              value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              required
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              required
              autoComplete="current-password"
            />
          </div>
          {error && <p className="form-error" style={{ textAlign: 'center' }}>{error}</p>}
          <button id="login-submit" type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Signing in…</> : 'Sign In →'}
          </button>
        </form>

        <div className="auth-divider" style={{ marginTop: '1.5rem' }}>
          <span>New here?</span>
        </div>
        <Link href="/auth/register" className="btn btn-ghost btn-full" style={{ marginTop: '0.75rem' }}>
          Register your restaurant
        </Link>
      </div>
    </div>
  );
}
